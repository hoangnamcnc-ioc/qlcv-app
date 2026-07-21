import { useState, useMemo } from "react";
import { DEPTS, RATING, LATE_REASONS, STATUS_ORDER, LATE_COMPLETION_PENALTY } from "../constants";
import { isCompletedStatus, parseJSON } from "../helpers";

// Toàn bộ logic tính hiệu suất/báo cáo: tổng hợp theo phòng ban, công thức điểm hiệu suất tháng,
// bảng xếp hạng năm, thống kê nguyên nhân trễ, cảnh báo quá tải, tiến bộ cá nhân.
// Tách khỏi App.jsx vì đây là cụm thuật toán riêng biệt, cần dễ soát lỗi độc lập (từng có bug NaN/điểm âm).
// Quy đổi 1-5 sao nghiệm thu dự án ngân sách sang thang đánh giá RATING (4 mức) dùng chung với nhiệm vụ thường
const projRatingKey = (stars) => stars >= 5 ? "xuat_sac" : stars === 4 ? "tot" : stars >= 2 ? "tb" : "kem";
// Quy đổi 1-3 sao duyệt từng bước (STEP_QUALITY ở Investment.jsx) sang cùng thang RATING
const stepRatingKey = (q) => q >= 3 ? "xuat_sac" : q === 2 ? "tot" : "tb";
// So sánh ngày duyệt bước (quality_at, định dạng dd/mm/yyyy) với hạn bước (end, ISO) để biết có trễ không
const isStepLate = (s) => {
  if (!s.end || !s.quality_at) return false;
  const [d, m, y] = s.quality_at.split("/");
  if (!d || !m || !y) return false;
  return new Date(y, m - 1, d) > new Date(s.end);
};

// Trọng số quy đổi 1 trường hợp hỗ trợ người dùng (điện thoại/Zalo/email) thành "việc":
// Khó = 1 việc, Trung bình = 1/2 việc, Nhanh = 1/4 việc
export const SUPPORT_WEIGHT = { hard: 1, medium: 0.5, easy: 0.25 };

// Chức danh (nhãn nhân viên) được coi là CẤP QUẢN LÝ — chấm "điểm điều hành" theo kết quả phòng, xếp hạng riêng.
export const MANAGER_EMP_ROLES = ["Trưởng phòng", "Phó trưởng phòng", "TP. HCTH", "PP. HCTH"];

export default function useReports({ computed, computedGlobal, employees, currentUser, overloadThreshold, projects, supportCases, otherTasks }) {
  // Báo cáo/xếp hạng dùng dữ liệu TOÀN CỤC để mọi vai trò thấy giống nhau; nếu vì lý do nào đó
  // không truyền computedGlobal thì lùi về computed (an toàn).
  const cg = computedGlobal || computed;
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  // ── Trường hợp hỗ trợ người dùng nền tảng số dùng chung → quy thành "việc hoàn thành" theo trọng số độ khó,
  // tính vào tháng theo ngày ghi nhận (created). Luôn coi là hoàn thành đúng hạn vì bản chất đã xử lý xong khi ghi nhận ──
  const supportPseudoTasks = useMemo(() => (supportCases || []).filter(c => c.eid && c.created).map(c => ({
    id: `support_${c.id}`, eid: c.eid, deadline: c.created, status: "completed", rating: "tot", collab_eids: c.collab_eids || "[]",
    suspicious_completion: false, weight: SUPPORT_WEIGHT[c.difficulty] ?? 0.5,
  })), [supportCases]);

  // ── Nhiệm vụ ngân sách quy thành "việc hoàn thành" để không thiệt thòi so với người chỉ làm nhiệm vụ thường:
  // (1) Mỗi BƯỚC đã duyệt+đánh giá tính 1 việc cho người chủ trì bước đó — không phải gộp cả dự án thành 1 việc,
  //     để không bị vướng ràng buộc "từ 5 việc/tháng mới đủ điều kiện chấm điểm".
  // (2) Khi cả dự án được BGĐ nghiệm thu (quality_rating), phụ trách chính được cộng thêm 1 việc đại diện quản lý tổng thể ──
  const projPseudoTasks = useMemo(() => {
    const out = [];
    for (const p of (projects || [])) {
      for (const s of parseJSON(p.steps, [])) {
        if (s.status !== "done" || !s.lead_eid || !s.quality) continue;
        const deadline = s.end || p.quality_rated_at;
        if (!deadline) continue;
        out.push({ id: `projstep_${p.id}_${s.id}`, eid: s.lead_eid, deadline, status: isStepLate(s) ? "completed_late" : "completed", rating: stepRatingKey(s.quality), collab_eids: "[]", suspicious_completion: false });
      }
      if (p.quality_rating && p.quality_rated_at && p.lead_eid) {
        const status = p.quality_on_time === false ? "completed_late" : "completed";
        out.push({ id: `projlead_${p.id}`, eid: p.lead_eid, deadline: p.quality_rated_at, status, rating: projRatingKey(p.quality_rating), collab_eids: "[]", suspicious_completion: false });
      }
    }
    return out;
  }, [projects]);

  const [repMonth, setRepMonth] = useState(today.getMonth());
  const [repYear, setRepYear] = useState(today.getFullYear());
  const [repTab, setRepTab] = useState("monthly");
  const [rankYear, setRankYear] = useState(today.getFullYear());

  // Mỗi "việc" có trọng số (weight, mặc định 1): nhiệm vụ sinh từ mẫu định kỳ (ngày 0.25 … năm 3)
  // và trường hợp hỗ trợ (Khó 1 / TB 0.5 / Nhanh 0.25). Dùng sumW khi cần "việc quy đổi".
  const w = t => t.weight ?? 1;
  const sumW = arr => Math.round(arr.reduce((s, t) => s + w(t), 0) * 100) / 100;

  // ── Tổng hợp điều hành theo phòng ban (cho BGĐ) ──
  const execDeptSummary = useMemo(() => DEPTS.map(d => {
    const dt = computed.filter(t => t.dept === d);
    const overdue = dt.filter(t => t.status === "overdue").length;
    const completedLate = dt.filter(t => t.status === "completed_late").length;
    const over = overdue + completedLate;
    const nd = dt.filter(t => t.status === "nearly_due").length;
    const done = dt.filter(t => isCompletedStatus(t.status)).length;
    const rate = dt.length ? Math.round(done / dt.length * 100) : 0;
    const deptEmpsList = (employees || []).filter(e => e.dept === d);
    const overloaded = deptEmpsList.filter(e => sumW(computed.filter(t => t.eid === e.id && !isCompletedStatus(t.status))) >= overloadThreshold).length;
    const lead = deptEmpsList.find(e => ["Trưởng phòng", "TP. HCTH"].includes(e.role));
    // Số "việc quy đổi" (theo trọng số) để so sánh tải giữa các phòng cho công bằng —
    // phòng nhiều nhiệm vụ hàng ngày (0.25) không bị thổi phồng như khi đếm thô.
    const totalW = sumW(dt);
    const doneW = sumW(dt.filter(t => isCompletedStatus(t.status)));
    // Tải bình quân đầu người (theo quy đổi) — phòng ít nhân sự mà nhiều việc sẽ lộ ra ở cột này
    const perHead = deptEmpsList.length ? Math.round(totalW / deptEmpsList.length * 100) / 100 : 0;
    // Tải ĐANG MỞ (chưa hoàn thành) quy đổi & bình quân đầu người — phản ánh áp lực hiện tại,
    // dùng để phát hiện phòng cần thêm người (quá tải) hay có thể dư người (dưới tải).
    const activeList = dt.filter(t => !isCompletedStatus(t.status));
    const activeW = sumW(activeList);
    const activePerHead = deptEmpsList.length ? Math.round(activeW / deptEmpsList.length * 100) / 100 : 0;
    return { dept: d, total: dt.length, totalW, doneW, perHead, activeW, activePerHead, over, overdue, completedLate, nd, done, rate, empCount: deptEmpsList.length, overloaded, lead: lead?.name || "—" };
  }), [computed, employees, overloadThreshold]);

  // ── Gợi ý nhân sự: so tải ĐANG MỞ quy đổi/người của từng phòng với mặt bằng chung để chỉ ra phòng nào
  // có dấu hiệu THIẾU người (tải cao hơn hẳn + có người quá tải) hay THỪA người (tải thấp hơn hẳn).
  // Chỉ mang tính tham khảo điều phối, không phải kết luận — nên đặt ngưỡng nới rộng để tránh báo động giả. ──
  const staffingAdvice = useMemo(() => {
    const rows = execDeptSummary.filter(d => d.empCount > 0);
    if (rows.length < 2) return [];
    const avg = rows.reduce((s, d) => s + d.activePerHead, 0) / rows.length;
    if (avg <= 0) return [];
    return rows.map(d => {
      let level = "balanced";
      if (d.activePerHead >= avg * 1.4 && d.overloaded > 0) level = "over";       // tải cao hơn ~40% VÀ có người quá tải
      else if (d.activePerHead <= avg * 0.5 && d.empCount >= 2) level = "under";  // tải chỉ bằng nửa mặt bằng
      return { dept: d.dept, empCount: d.empCount, activeW: d.activeW, activePerHead: d.activePerHead, overloaded: d.overloaded, avgPerHead: Math.round(avg * 100) / 100, level };
    }).filter(d => d.level !== "balanced").sort((a, b) => (a.level === "over" ? -1 : 1) - (b.level === "over" ? -1 : 1));
  }, [execDeptSummary]);

  const repTasks = useMemo(() => cg.filter(t => { const d = new Date(t.deadline); return d.getFullYear() === repYear && d.getMonth() === repMonth; }), [cg, repYear, repMonth]);
  // Kèm bản QUY ĐỔI (…W) bên cạnh số đầu việc để hiển thị song song / đổi biểu đồ
  const repStats = useMemo(() => {
    const total = repTasks.length, done = repTasks.filter(t => isCompletedStatus(t.status)).length, over = repTasks.filter(t => t.status === "overdue").length, completedLate = repTasks.filter(t => t.status === "completed_late").length;
    const totalW = sumW(repTasks), doneW = sumW(repTasks.filter(t => isCompletedStatus(t.status))), overW = sumW(repTasks.filter(t => t.status === "overdue")), completedLateW = sumW(repTasks.filter(t => t.status === "completed_late"));
    return { total, done, over, completedLate, rate: total ? Math.round(done / total * 100) : 0, totalW, doneW, overW, completedLateW, rateW: totalW ? Math.round(doneW / totalW * 100) : 0 };
  }, [repTasks]);
  const repDeptData = useMemo(() => DEPTS.map(d => { const dt = repTasks.filter(t => t.dept === d); const done = dt.filter(t => isCompletedStatus(t.status)).length; const over = dt.filter(t => t.status === "overdue").length; const completedLate = dt.filter(t => t.status === "completed_late").length; return { name: d, total: dt.length, done, over, completedLate, rate: dt.length ? Math.round(done / dt.length * 100) : 0, totalW: sumW(dt), doneW: sumW(dt.filter(t => isCompletedStatus(t.status))), overW: sumW(dt.filter(t => t.status === "overdue")), completedLateW: sumW(dt.filter(t => t.status === "completed_late")) }; }), [repTasks]);

  // ── Vai trò phối hợp (collab_eids) trên việc ĐÃ HOÀN THÀNH được tính = 1/2 trọng số của việc chính
  // cho người phối hợp (không phải luôn cố định 0.5 việc — nhiệm vụ định kỳ có trọng số khác 1 thì
  // người phối hợp cũng phải theo đúng tỷ lệ, tránh trường hợp phối hợp việc hàng ngày (0.25) lại
  // được tính nhiều hơn cả người thực hiện chính), cộng thẳng vào tổng số việc/điểm chất lượng/thời hạn
  // của họ (giống cách tính hỗ trợ ND/dự án ngân sách) — không tính việc đang dở dang vì chưa có kết quả để đánh giá ──
  const collabPseudoTasks = useMemo(() => {
    const out = [];
    // Gồm cả trường hợp hỗ trợ (supportPseudoTasks) để người phối hợp được cộng 1/2 trọng số như việc thường
    for (const t of [...cg, ...supportPseudoTasks]) {
      if (!isCompletedStatus(t.status)) continue;
      for (const cid of parseJSON(t.collab_eids, [])) {
        if (cid === t.eid) continue; // tránh trùng nếu dữ liệu lỗi gán chính mình vào phối hợp
        out.push({ id: `collab_${t.id}_${cid}`, eid: cid, deadline: t.deadline, status: t.status, rating: t.rating, collab_eids: "[]", suspicious_completion: false, weight: (t.weight ?? 1) * 0.5 });
      }
    }
    return out;
  }, [cg, supportPseudoTasks]);

  // ── Index theo (nhân viên | năm | tháng) — dựng MỘT lần, tra cứu O(1) thay vì quét toàn bộ mỗi lần ──
  // byEid: việc mình chủ trì (đã gồm phối hợp weight 0.5) ; byCollab: đếm thô số việc phối hợp (chỉ để hiển thị badge)
  const perfIndex = useMemo(() => {
    const byEid = new Map(), byCollab = new Map();
    const push = (map, key, t) => { let a = map.get(key); if (!a) { a = []; map.set(key, a); } a.push(t); };
    for (const t of [...cg, ...projPseudoTasks, ...supportPseudoTasks, ...collabPseudoTasks]) {
      if (!t.deadline) continue;
      const d = new Date(t.deadline); if (isNaN(d)) continue;
      const ym = `${d.getFullYear()}|${d.getMonth()}`;
      push(byEid, `${t.eid}|${ym}`, t);
    }
    // Dùng lại chính collabPseudoTasks (đã có eid=người phối hợp + weight=1/2 trọng số việc chính)
    // thay vì tự dò lại collab_eids trên việc gốc — nếu không, badge "🤝 X/Y" sẽ hiện SAI (bằng trọng số
    // đầy đủ của việc chính) trong khi điểm thực tế cộng cho người phối hợp chỉ có 1/2, gây hiểu nhầm.
    for (const t of collabPseudoTasks) {
      if (!t.deadline) continue;
      const d = new Date(t.deadline); if (isNaN(d)) continue;
      const ym = `${d.getFullYear()}|${d.getMonth()}`;
      push(byCollab, `${t.eid}|${ym}`, t);
    }
    return { byEid, byCollab };
  }, [cg, projPseudoTasks, supportPseudoTasks, collabPseudoTasks]);

  // ── Công thức tính điểm hiệu suất 1 THÁNG (dùng chung cho bảng "Hiệu suất tháng" và "Xếp hạng năm") ──
  // (w / sumW đã khai báo ở trên, dùng chung cho cả tổng hợp điều hành lẫn chấm điểm)
  const calcMonthPerf = (empId, year, month) => {
    const ym = `${year}|${month}`;
    const et = perfIndex.byEid.get(`${empId}|${ym}`) || [];
    // Phân loại theo trạng thái
    const onTimeTasks = et.filter(t => t.status === "completed");   // HT đúng hạn (Đ)
    const onTime = sumW(onTimeTasks);
    const completedLate = sumW(et.filter(t => t.status === "completed_late")); // HT trễ (T)
    const over = sumW(et.filter(t => t.status === "overdue"));                 // Quá hạn chưa xong (Q)
    const done = Math.round((onTime + completedLate) * 100) / 100;
    const resolved = Math.round((onTime + completedLate + over) * 100) / 100; // Mẫu số N = việc đã đến hạn
    const etWeight = sumW(et);
    const completionRate = etWeight ? Math.round(done / etWeight * 100) : 0;
    // Đủ điều kiện chấm điểm khi có ≥5 việc ĐÃ ĐẾN HẠN (resolved), không phải ≥5 tổng việc — vì toàn bộ
    // điểm (thời hạn/chất lượng/phạt/thưởng) chỉ tính trên việc đã đến hạn; nếu xét theo tổng việc thì
    // người mới có 5 việc nhưng chỉ 2 việc đến hạn vẫn bị chấm điểm trên 2 việc (mẫu quá nhỏ, thiếu tin cậy).
    // Khớp đúng chú thích "≥5 việc đến hạn" hiển thị khắp báo cáo. Cuối tháng (lúc chốt sổ) mọi việc đều
    // đã đến hạn nên resolved = tổng việc, hai cách cho kết quả như nhau — chỉ khác khi xem giữa tháng.
    const eligible = resolved >= 5;
    // Task phối hợp trong tháng
    const collabTasks = perfIndex.byCollab.get(`${empId}|${ym}`) || [];
    const collabDone = sumW(collabTasks.filter(t => isCompletedStatus(t.status)));
    const collabTotal = sumW(collabTasks);
    let perfScore = 0, breakdown = null;
    // Tính điểm cho MỌI người có ≥1 việc đến hạn (kể cả <5) — người <5 chỉ dùng làm "điểm tham khảo",
    // KHÔNG được xếp hạng/chốt sổ (vẫn dựa vào cờ eligible = resolved>=5).
    if (resolved > 0) {
      // ① Điểm thời hạn (tối đa 60) — chưa có việc nào đến hạn xử lý xong thì tạm tính 0, tránh chia cho 0
      const timeliness = resolved > 0 ? (onTime * 60 + completedLate * 30) / resolved : 0;
      // ② Điểm chất lượng (tối đa 40)
      const qualitySum = onTimeTasks.reduce((s, t) => s + (RATING[t.rating] ? RATING[t.rating].score : 2) * w(t), 0);
      const quality = resolved > 0 ? qualitySum / (resolved * 4) * 40 : 0;
      // ③ Phạt trễ/quá hạn
      const penalty = (over + completedLate) * LATE_COMPLETION_PENALTY;
      // ④ Thưởng khối lượng — chỉ tính khi việc đã đến hạn (resolved) vượt quá 15, tránh thưởng
      // cho khối lượng còn thấp (trước đây bắt đầu tính từ việc thứ 6, dễ thưởng quá sớm)
      const workloadBonus = Math.max(0, Math.min((resolved - 15) * 1, 10));
      perfScore = Math.max(0, Math.min(100, Math.round(timeliness + quality - penalty + workloadBonus)));
      // Lưu chi tiết để hiển thị "Vì sao điểm này?"
      breakdown = { timeliness: Math.round(timeliness * 10) / 10, quality: Math.round(quality * 10) / 10, penalty, workloadBonus };
    }
    return { total: etWeight, done, onTime, completedLate, over, resolved, completionRate, collabTotal, collabDone, perfScore, eligible, breakdown };
  };

  const repEmpData = useMemo(() => (employees || []).filter(e => !MANAGER_EMP_ROLES.includes(e.role)).map(emp => {
    const m = calcMonthPerf(emp.id, repYear, repMonth);
    return { ...emp, ...m, perfScore: m.perfScore };
  }).filter(e => e.total > 0).sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1; // người đủ điều kiện hiện trước
    if (b.perfScore !== a.perfScore) return b.perfScore - a.perfScore;
    return b.done - a.done; // cùng điểm -> ai hoàn thành nhiều việc hơn xếp trên
  }), [employees, repYear, repMonth, cg, projPseudoTasks, supportPseudoTasks, collabPseudoTasks]);

  const repMonthTrend = useMemo(() => { const months = []; for (let i = 5; i >= 0; i--) { const d = new Date(repYear, repMonth - i, 1); const m = d.getMonth(), y = d.getFullYear(); const mt = cg.filter(t => { const td = new Date(t.deadline); return td.getFullYear() === y && td.getMonth() === m; }); months.push({ name: `T${m + 1}`, done: mt.filter(t => isCompletedStatus(t.status)).length, total: mt.length, doneW: sumW(mt.filter(t => isCompletedStatus(t.status))), totalW: sumW(mt) }); } return months; }, [cg, repYear, repMonth]);

  // ── HỒ SƠ 1 NHÂN VIÊN (gộp mọi chỉ số cho trưởng phòng đánh giá từng người) ──
  // Gộp: điểm/khối lượng tháng đang xem (đã gồm hỗ trợ + bước ngân sách + phối hợp ½ qua calcMonthPerf),
  // xu hướng điểm 6 tháng, việc đang mở (chưa xong) sắp theo độ khẩn, và thống kê nguyên nhân trễ của riêng người đó.
  const empProfile = (empId) => {
    const emp = (employees || []).find(e => e.id === empId);
    if (!emp) return null;
    const cur = calcMonthPerf(empId, repYear, repMonth);
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(repYear, repMonth - i, 1); const m = d.getMonth(), y = d.getFullYear();
      const mp = calcMonthPerf(empId, y, m);
      trend.push({ name: `T${m + 1}`, score: mp.resolved > 0 ? mp.perfScore : null, eligible: mp.eligible, resolved: mp.resolved, done: mp.done });
    }
    // Việc đang mở (nhiệm vụ thường) của người này — dùng cg để đủ dữ liệu, sắp việc khẩn lên trước
    const open = cg.filter(t => t.eid === empId && !isCompletedStatus(t.status))
      .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9))
      .map(t => ({ id: t.id, title: t.title, dept: t.dept, deadline: t.deadline, status: t.status, prio: t.prio, weight: t.weight ?? 1, nudge_count: t.nudge_count || 0 }));
    const openW = sumW(open);
    // Nguyên nhân trễ của riêng người này (mọi thời gian) — nhìn ra "hay trễ vì lý do gì"
    const myLate = cg.filter(t => t.eid === empId && t.late_reason);
    const lateReasons = LATE_REASONS.map(r => ({ ...r, count: myLate.filter(t => t.late_reason === r.value).length })).filter(r => r.count > 0).sort((a, b) => b.count - a.count);
    const onTimeRate = cur.resolved > 0 ? Math.round(cur.onTime / cur.resolved * 100) : 0;
    return { emp, cur, trend, open, openCount: open.length, openW, lateReasons, lateTotal: myLate.length, onTimeRate };
  };

  // ── ĐIỂM ĐIỀU HÀNH cho Trưởng/Phó phòng (kết hợp: hiệu quả điều hành phòng + khối lượng điều hành) ──
  // Điểm không dựa trên vài việc giao đích danh cho họ (vốn rất ít), mà dựa trên KẾT QUẢ CẢ PHÒNG họ điều hành:
  //   ① Đúng hạn phòng (tối đa 60): (đúng hạn×60 + trễ×30) / việc phòng đã đến hạn — thưởng phòng làm đúng hạn.
  //   ② Chất lượng phòng (tối đa 40): trung bình nghiệm thu việc phòng.
  //   ③ − Tồn đọng quá hạn (tối đa 10): tỷ lệ việc phòng còn quá hạn chưa xong.
  //   ④ + Khối lượng điều hành (tối đa 10): phòng vận hành càng nhiều việc (đã đến hạn) càng được ghi nhận công quản lý.
  // Tất cả tính theo QUY ĐỔI (trọng số định kỳ). Đủ điều kiện khi phòng có ≥5 việc quy đổi đã đến hạn trong tháng.
  const managerPerf = (empId, year, month) => {
    const emp = (employees || []).find(e => e.id === empId);
    if (!emp) return { dept: null, resolvedW: 0, doneW: 0, onTimeW: 0, overW: 0, onTimeRate: 0, perfScore: 0, eligible: false, breakdown: null };
    const dept = emp.dept;
    const dt = cg.filter(t => { if (t.dept !== dept) return false; const d = new Date(t.deadline); return d.getFullYear() === year && d.getMonth() === month; });
    const onTimeTasks = dt.filter(t => t.status === "completed");
    const onTimeW = sumW(onTimeTasks);
    const lateW = sumW(dt.filter(t => t.status === "completed_late"));
    const overW = sumW(dt.filter(t => t.status === "overdue"));
    const doneW = Math.round((onTimeW + lateW) * 100) / 100;
    const resolvedW = Math.round((onTimeW + lateW + overW) * 100) / 100;
    const eligible = resolvedW >= 5;
    const onTimeRate = resolvedW > 0 ? Math.round(onTimeW / resolvedW * 100) : 0;
    let perfScore = 0, breakdown = null;
    if (resolvedW > 0) {
      const timeliness = (onTimeW * 60 + lateW * 30) / resolvedW;                         // ① 0..60
      const qualitySum = onTimeTasks.reduce((s, t) => s + (RATING[t.rating] ? RATING[t.rating].score : 2) * w(t), 0);
      const quality = qualitySum / (resolvedW * 4) * 40;                                   // ② 0..40
      const penalty = Math.round(overW / resolvedW * 10 * 10) / 10;                        // ③ 0..10 (tỷ lệ tồn đọng)
      const mgmtBonus = Math.max(0, Math.min((resolvedW - 15) * 0.5, 10));                 // ④ 0..10 (khối lượng điều hành)
      perfScore = Math.max(0, Math.min(100, Math.round(timeliness + quality - penalty + mgmtBonus)));
      breakdown = { timeliness: Math.round(timeliness * 10) / 10, quality: Math.round(quality * 10) / 10, penalty, mgmtBonus: Math.round(mgmtBonus * 10) / 10 };
    }
    return { dept, resolvedW, doneW, onTimeW, overW, onTimeRate, perfScore, eligible, breakdown };
  };

  // Bảng điểm điều hành THÁNG (xếp hạng riêng cho cấp quản lý)
  const managerBoard = useMemo(() => (employees || [])
    .filter(e => MANAGER_EMP_ROLES.includes(e.role))
    .map(e => ({ ...e, ...managerPerf(e.id, repYear, repMonth) }))
    .sort((a, b) => { if (a.eligible !== b.eligible) return a.eligible ? -1 : 1; if (b.perfScore !== a.perfScore) return b.perfScore - a.perfScore; return (b.doneW || 0) - (a.doneW || 0); }),
    [employees, repYear, repMonth, cg]);

  // Bảng điểm điều hành NĂM (trung bình có điều chỉnh theo số tháng đủ ĐK, giống bảng nhân viên)
  const managerLeaderboard = useMemo(() => {
    const raw = (employees || []).filter(e => MANAGER_EMP_ROLES.includes(e.role)).map(emp => {
      const monthly = [...Array(12)].map((_, m) => managerPerf(emp.id, rankYear, m));
      const eligibleMonths = monthly.filter(m => m.eligible);
      const resolvedW = Math.round(monthly.reduce((s, m) => s + (m.resolvedW || 0), 0) * 100) / 100;
      const doneW = Math.round(monthly.reduce((s, m) => s + (m.doneW || 0), 0) * 100) / 100;
      const rawScore = eligibleMonths.length ? eligibleMonths.reduce((s, m) => s + m.perfScore, 0) / eligibleMonths.length : null;
      return { ...emp, resolvedW, doneW, eligibleMonths: eligibleMonths.length, rawScore, monthly };
    }).filter(e => e.monthly.some(m => m.resolvedW > 0));
    const PRIOR = 2; let sumAll = 0, cntAll = 0;
    raw.forEach(e => e.monthly.filter(m => m.eligible).forEach(m => { sumAll += m.perfScore; cntAll++; }));
    const baseline = cntAll ? sumAll / cntAll : 0;
    return raw.map(e => { const v = e.eligibleMonths; const score = v ? Math.round((v / (v + PRIOR)) * e.rawScore + (PRIOR / (v + PRIOR)) * baseline) : null; return { ...e, rawScore: v ? Math.round(e.rawScore) : null, baseline: Math.round(baseline), score }; })
      .sort((a, b) => { const aH = a.score !== null, bH = b.score !== null; if (aH !== bH) return aH ? -1 : 1; if (aH && bH && b.score !== a.score) return b.score - a.score; return (b.doneW || 0) - (a.doneW || 0); });
  }, [employees, rankYear, cg]);

  const leaderboard = useMemo(() => {
    const raw = (employees || []).map(emp => {
      const monthly = [...Array(12)].map((_, m) => calcMonthPerf(emp.id, rankYear, m));
      const eligibleMonths = monthly.filter(m => m.eligible);
      const total = monthly.reduce((s, m) => s + m.total, 0);
      const resolved = monthly.reduce((s, m) => s + (m.resolved || 0), 0); // việc đã đến hạn (dùng để tính điểm) — total còn gồm cả việc chưa đến hạn
      const done = monthly.reduce((s, m) => s + m.done, 0);
      const over = monthly.reduce((s, m) => s + (m.over || 0), 0);
      const completedLate = monthly.reduce((s, m) => s + (m.completedLate || 0), 0);
      const rawScore = eligibleMonths.length ? eligibleMonths.reduce((s, m) => s + m.perfScore, 0) / eligibleMonths.length : null;
      const collabTotal = monthly.reduce((s, m) => s + (m.collabTotal || 0), 0);
      const collabDone = monthly.reduce((s, m) => s + (m.collabDone || 0), 0);
      return { ...emp, total, resolved, done, completedLate, over, collabTotal, collabDone, eligibleMonths: eligibleMonths.length, rawScore, rate: total ? Math.round(done / total * 100) : 0, monthly };
    }).filter(e => e.total > 0 && !MANAGER_EMP_ROLES.includes(e.role));

    // ── Làm công bằng hơn cho người có ÍT tháng đủ điều kiện: dùng "trung bình có điều chỉnh"
    // (Bayesian/weighted average, giống cách IMDB xếp hạng phim) thay vì trung bình cộng thô.
    // Lý do: 1 tháng điểm cao là mẫu quá nhỏ, không đủ tin cậy để xếp trên người có 2-3 tháng ổn định.
    // Công thức: score = (v/(v+PRIOR)) × rawScore + (PRIOR/(v+PRIOR)) × baseline
    //   v = số tháng đủ điều kiện của người đó, baseline = điểm TB chung của TẤT CẢ tháng đủ điều kiện
    //   trong năm (mọi nhân viên gộp lại), PRIOR = "trọng số ảo" kéo điểm về baseline khi v nhỏ.
    // Càng ít tháng dữ liệu, điểm càng bị kéo gần baseline hơn — công bằng dần khi có thêm dữ liệu thật.
    const PRIOR_MONTHS = 2;
    let sumAll = 0, cntAll = 0;
    raw.forEach(e => e.monthly.filter(m => m.eligible).forEach(m => { sumAll += m.perfScore; cntAll++; }));
    const baseline = cntAll ? sumAll / cntAll : 0;

    return raw.map(e => {
      const v = e.eligibleMonths;
      const score = v ? Math.round((v / (v + PRIOR_MONTHS)) * e.rawScore + (PRIOR_MONTHS / (v + PRIOR_MONTHS)) * baseline) : null;
      return { ...e, rawScore: v ? Math.round(e.rawScore) : null, baseline: Math.round(baseline), score };
    }).sort((a, b) => {
      const aHas = a.score !== null, bHas = b.score !== null;
      if (aHas !== bHas) return aHas ? -1 : 1;
      if (aHas && bHas && b.score !== a.score) return b.score - a.score;
      return b.rate - a.rate;
    });
  }, [cg, employees, rankYear, projPseudoTasks, supportPseudoTasks, collabPseudoTasks]);

  const lateReasonStats = useMemo(() => { const lt = cg.filter(t => t.late_reason); const total = lt.length; return LATE_REASONS.map(r => { const tasksForReason = lt.filter(t => t.late_reason === r.value); return { ...r, count: tasksForReason.length, pct: total ? Math.round(tasksForReason.length / total * 100) : 0, tasks: tasksForReason }; }).filter(r => r.count > 0).sort((a, b) => b.count - a.count); }, [cg]);
  // Cảnh báo quá tải tính theo KHỐI LƯỢNG QUY ĐỔI (activeW) chứ không đếm thô đầu việc — người ôm 12 việc
  // hàng ngày (0.25 → 3 quy đổi) không bị coi ngang người ôm 8 dự án (8 quy đổi). Ngưỡng người dùng đặt được
  // hiểu là "số việc quy đổi đang mở". Vẫn giữ activeCount để hiển thị số đầu việc thực tế cho dễ hình dung.
  const overloadedEmps = useMemo(() => (employees || []).map(emp => { const active = computed.filter(t => t.eid === emp.id && !isCompletedStatus(t.status)); return { ...emp, activeCount: active.length, activeW: sumW(active) }; }).filter(e => e.activeW >= overloadThreshold).sort((a, b) => b.activeW - a.activeW), [employees, computed, overloadThreshold]);

  const myTrend = useMemo(() => { if (!currentUser?.employee_id) return []; const months = []; for (let i = 5; i >= 0; i--) { const d = new Date(today.getFullYear(), today.getMonth() - i, 1); const m = d.getMonth(), y = d.getFullYear(); const mt = computed.filter(t => { const td = new Date(t.deadline); return td.getFullYear() === y && td.getMonth() === m && (t.eid === currentUser.employee_id || parseJSON(t.collab_eids, []).includes(currentUser.employee_id)); }); months.push({ name: `T${m + 1}`, "Hoàn thành": mt.filter(t => isCompletedStatus(t.status)).length, "Tổng": mt.length }); } return months; }, [computed, currentUser]);
  // "Việc của tôi" — gộp ĐỦ khối lượng thực của nhân viên trên mọi module (đếm đầu việc, mỗi mục = 1):
  // (1) nhiệm vụ thường/định kỳ, (2) trường hợp Hỗ trợ ND/Xử lý lỗi TTDL, (3) bước dự án ngân sách,
  // (4) bước Nhiệm vụ khác — tính cả vai trò chủ trì lẫn phối hợp. Riêng Quá hạn/Sắp hết hạn chỉ áp cho
  // nhiệm vụ thường (các module kia không có cùng khái niệm hạn chót từng mục).
  const myTasks = useMemo(() => {
    const eid = currentUser?.employee_id;
    if (!eid) return null;
    const inList = ids => parseJSON(ids, []).includes(eid);
    const my = computed.filter(t => t.eid === eid || inList(t.collab_eids));
    let total = my.length;
    let done = my.filter(t => isCompletedStatus(t.status)).length;
    let over = my.filter(t => t.status === "overdue").length;
    const completedLate = my.filter(t => t.status === "completed_late").length;
    let nd = my.filter(t => t.status === "nearly_due").length;
    const active = my.filter(t => !isCompletedStatus(t.status));
    const supportCount = (supportCases || []).filter(c => c.eid === eid || inList(c.collab_eids)).length;
    // Trạng thái hạn của từng bước (chưa done/bỏ qua): quá hạn nếu hạn < hôm nay, sắp hết hạn nếu còn ≤3 ngày
    // — cùng công thức nhiệm vụ thường. Dự án dùng s.end, nhiệm vụ khác dùng s.deadline.
    const countSteps = (arr, dlField) => { let d = 0, a = 0, ov = 0, nDue = 0; for (const item of (arr || [])) for (const s of parseJSON(item.steps, [])) { if (s.lead_eid === eid || inList(s.collab_eids)) { if (s.status === "done") d++; else { a++; const dl = s[dlField]; if (dl && s.status !== "skipped") { const dd = new Date(dl); dd.setHours(0, 0, 0, 0); const dleft = Math.ceil((dd - today) / 86400000); if (dleft < 0) ov++; else if (dleft <= 3) nDue++; } } } } return { d, a, ov, nd: nDue }; };
    const proj = countSteps(projects, "end");
    const other = countSteps(otherTasks, "deadline");
    total += supportCount + proj.d + proj.a + other.d + other.a;
    done += supportCount + proj.d + other.d;
    over += proj.ov + other.ov;
    nd += proj.nd + other.nd;
    return { total, done, over, completedLate, nd, rate: total ? Math.round(done / total * 100) : 0,
      pending: active.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)).slice(0, 3),
      breakdown: { task: my.length, support: supportCount, proj: proj.d + proj.a, other: other.d + other.a } };
  }, [computed, currentUser, supportCases, projects, otherTasks]);

  // Danh sách công việc CÒN LÀM của tôi trên mọi module (chủ trì + phối hợp), sắp xếp hạn gần nhất/quá hạn lên đầu.
  // Không gồm việc đã hoàn thành/bỏ qua và trường hợp Hỗ trợ (bản chất đã xử lý xong khi ghi nhận).
  const myWorkList = useMemo(() => {
    const eid = currentUser?.employee_id;
    if (!eid) return [];
    const inList = ids => parseJSON(ids, []).includes(eid);
    const stepStat = dlStr => { if (!dlStr) return "on_time"; const dd = new Date(dlStr); if (isNaN(dd)) return "on_time"; dd.setHours(0, 0, 0, 0); const dl = Math.ceil((dd - today) / 86400000); return dl < 0 ? "overdue" : dl <= 3 ? "nearly_due" : "on_time"; };
    const out = [];
    for (const t of computed) {
      if (isCompletedStatus(t.status)) continue;
      if (!(t.eid === eid || inList(t.collab_eids))) continue;
      out.push({ key: `t_${t.id}`, kind: "task", typeLabel: "Nhiệm vụ", title: t.title, dept: t.dept, deadline: t.deadline, prio: t.prio, role: t.eid === eid ? "Chủ trì" : "Phối hợp", status: t.status, task: t });
    }
    for (const p of (projects || [])) for (const s of parseJSON(p.steps, [])) {
      if (s.status === "done" || s.status === "skipped") continue;
      if (!(s.lead_eid === eid || inList(s.collab_eids))) continue;
      out.push({ key: `p_${p.id}_${s.id}`, kind: "proj", typeLabel: "Ngân sách", title: `${p.name} · ${s.content || "Bước"}`, dept: p.dept, deadline: s.end, role: s.lead_eid === eid ? "Chủ trì" : "Phối hợp", status: stepStat(s.end) });
    }
    for (const t of (otherTasks || [])) for (const s of parseJSON(t.steps, [])) {
      if (s.status === "done" || s.status === "skipped") continue;
      if (!(s.lead_eid === eid || inList(s.collab_eids))) continue;
      out.push({ key: `o_${t.id}_${s.id}`, kind: "other", typeLabel: "NV khác", title: `${t.name || ""} · ${s.content || "Bước"}`, dept: t.dept, deadline: s.deadline, role: s.lead_eid === eid ? "Chủ trì" : "Phối hợp", status: stepStat(s.deadline) });
    }
    // Ưu tiên = quá hạn/gần hết hạn lên đầu, đồng thời việc Ưu tiên CAO được "kéo" lên sớm ~2 ngày,
    // việc Ưu tiên THẤP lùi lại ~2 ngày (chỉ nhiệm vụ thường có mức ưu tiên; bước dự án/NV khác coi như Trung bình).
    const prioAdj = p => p === "high" ? -2 : p === "low" ? 2 : 0;
    const dleft = d => { if (!d) return 99999; const dd = new Date(d); if (isNaN(dd)) return 99999; dd.setHours(0, 0, 0, 0); return Math.ceil((dd - today) / 86400000); };
    return out.sort((a, b) => (dleft(a.deadline) + prioAdj(a.prio)) - (dleft(b.deadline) + prioAdj(b.prio)));
  }, [computed, currentUser, projects, otherTasks]);

  // So sánh khối lượng (việc quy đổi) của tôi với TRUNG BÌNH phòng trong tháng hiện tại
  const myWorkloadCompare = useMemo(() => {
    const eid = currentUser?.employee_id; if (!eid) return null;
    const emp = (employees || []).find(e => e.id === eid); if (!emp) return null;
    const y = today.getFullYear(), m = today.getMonth();
    const mine = calcMonthPerf(eid, y, m).total;
    const totals = (employees || []).filter(e => e.dept === emp.dept).map(e => calcMonthPerf(e.id, y, m).total).filter(v => v > 0);
    const deptAvg = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
    return { mine: Math.round(mine * 100) / 100, deptAvg: Math.round(deptAvg * 100) / 100, dept: emp.dept, n: totals.length, diffPct: deptAvg ? Math.round((mine - deptAvg) / deptAvg * 100) : 0 };
  }, [currentUser, employees, perfIndex]);

  // Việc tôi ĐÃ HOÀN THÀNH trong tháng hiện tại (gộp mọi module) — để tự soi lại trước kỳ đánh giá
  const myDoneList = useMemo(() => {
    const eid = currentUser?.employee_id; if (!eid) return [];
    const inList = ids => parseJSON(ids, []).includes(eid);
    const y = today.getFullYear(), m = today.getMonth();
    const inMonth = d => { if (!d) return false; const dd = new Date(d); return !isNaN(dd) && dd.getFullYear() === y && dd.getMonth() === m; };
    const out = [];
    for (const t of computed) { if (!isCompletedStatus(t.status)) continue; if (!(t.eid === eid || inList(t.collab_eids))) continue; if (!inMonth(t.deadline)) continue; out.push({ key: `dt_${t.id}`, kind: "task", typeLabel: "Nhiệm vụ", title: t.title, date: t.deadline, role: t.eid === eid ? "Chủ trì" : "Phối hợp", status: t.status, task: t }); }
    for (const c of (supportCases || [])) { if (!(c.eid === eid || inList(c.collab_eids))) continue; if (!inMonth(c.created)) continue; out.push({ key: `ds_${c.id}`, kind: "support", typeLabel: "Hỗ trợ", title: c.content || "Trường hợp hỗ trợ", date: c.created, role: c.eid === eid ? "Chủ trì" : "Phối hợp", status: "completed" }); }
    for (const p of (projects || [])) for (const s of parseJSON(p.steps, [])) { if (s.status !== "done") continue; if (!(s.lead_eid === eid || inList(s.collab_eids))) continue; if (!inMonth(s.end)) continue; out.push({ key: `dp_${p.id}_${s.id}`, kind: "proj", typeLabel: "Ngân sách", title: `${p.name} · ${s.content || "Bước"}`, date: s.end, role: s.lead_eid === eid ? "Chủ trì" : "Phối hợp", status: "completed" }); }
    for (const t of (otherTasks || [])) for (const s of parseJSON(t.steps, [])) { if (s.status !== "done") continue; if (!(s.lead_eid === eid || inList(s.collab_eids))) continue; if (!inMonth(s.deadline)) continue; out.push({ key: `do_${t.id}_${s.id}`, kind: "other", typeLabel: "NV khác", title: `${t.name || ""} · ${s.content || "Bước"}`, date: s.deadline, role: s.lead_eid === eid ? "Chủ trì" : "Phối hợp", status: "completed" }); }
    return out.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [computed, currentUser, supportCases, projects, otherTasks]);

  return {
    repMonth, setRepMonth, repYear, setRepYear, repTab, setRepTab, rankYear, setRankYear,
    execDeptSummary, staffingAdvice, empProfile, managerBoard, managerLeaderboard, repTasks, repStats, repDeptData, repEmpData, repMonthTrend, leaderboard,
    lateReasonStats, overloadedEmps, myTrend, myTasks, myWorkList, myWorkloadCompare, myDoneList,
    calcMonthPerf, // dùng cho "chốt sổ" điểm tháng vào bảng monthly_scores (snapshot cố định, không đổi khi dữ liệu sống bị sửa)
  };
}
