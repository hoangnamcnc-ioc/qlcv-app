import { useState, useMemo } from "react";
import { DEPTS, RATING, LATE_REASONS, STATUS_ORDER } from "../constants";
import { isCompletedStatus, parseJSON, pendingApprovalDays } from "../helpers";
import { w, sumW, staffScore, managerScore } from "../scoring";

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
  // Kỳ thống kê cho bảng "Tổng hợp điều hành" — mặc định THÁNG HIỆN HÀNH. execMonth = -1 nghĩa là "Toàn bộ thời gian".
  const [execMonth, setExecMonth] = useState(today.getMonth());
  const [execYear, setExecYear] = useState(today.getFullYear());

  // w / sumW (trọng số quy đổi) và các công thức điểm dùng chung từ scoring.js (đã import ở đầu file).

  // ── Tổng hợp điều hành theo phòng ban (cho BGĐ) ──
  const execDeptSummary = useMemo(() => DEPTS.map(d => {
    const dtAll = computed.filter(t => t.dept === d);
    // Cột thống kê (Tổng/Quy đổi/HT/Quá hạn/Tỷ lệ) theo KỲ đã chọn; cột "Quá tải" & tải đang mở giữ theo HIỆN TẠI.
    const dt = execMonth < 0 ? dtAll : dtAll.filter(t => { const td = new Date(t.deadline); return td.getFullYear() === execYear && td.getMonth() === execMonth; });
    const overdue = dt.filter(t => t.status === "overdue").length;
    const completedLate = dt.filter(t => t.status === "completed_late").length;
    const over = overdue + completedLate;
    const nd = dt.filter(t => t.status === "nearly_due").length;
    const done = dt.filter(t => isCompletedStatus(t.status)).length;
    const rate = dt.length ? Math.round(done / dt.length * 100) : 0;
    const deptEmpsList = (employees || []).filter(e => e.dept === d && !e.no_kpi); // loại người khoán lương/không tính KPI khỏi đầu người phòng
    const overloaded = deptEmpsList.filter(e => sumW(computed.filter(t => t.eid === e.id && !isCompletedStatus(t.status))) >= overloadThreshold).length;
    const lead = deptEmpsList.find(e => ["Trưởng phòng", "TP. HCTH"].includes(e.role));
    // Số "việc quy đổi" (theo trọng số) để so sánh tải giữa các phòng cho công bằng —
    // phòng nhiều nhiệm vụ hàng ngày (0.25) không bị thổi phồng như khi đếm thô.
    const totalW = sumW(dt);
    const doneW = sumW(dt.filter(t => isCompletedStatus(t.status)));
    // Tải bình quân đầu người (theo quy đổi) — phòng ít nhân sự mà nhiều việc sẽ lộ ra ở cột này
    const perHead = deptEmpsList.length ? Math.round(totalW / deptEmpsList.length * 100) / 100 : 0;
    // Tải ĐANG MỞ (chưa hoàn thành) quy đổi & bình quân đầu người — phản ánh áp lực HIỆN TẠI (không lọc theo kỳ),
    // dùng để phát hiện phòng cần thêm người (quá tải) hay có thể dư người (dưới tải).
    const activeList = dtAll.filter(t => !isCompletedStatus(t.status));
    const activeW = sumW(activeList);
    const activePerHead = deptEmpsList.length ? Math.round(activeW / deptEmpsList.length * 100) / 100 : 0;
    return { dept: d, total: dt.length, totalW, doneW, perHead, activeW, activePerHead, over, overdue, completedLate, nd, done, rate, empCount: deptEmpsList.length, overloaded, lead: lead?.name || "—" };
  }), [computed, employees, overloadThreshold, execMonth, execYear]);

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
  // Thống kê THÁNG TRƯỚC (cùng cách tính) để so sánh kỳ — hiện mũi tên ▲▼ % thay đổi trên các thẻ chỉ số.
  const repStatsPrev = useMemo(() => {
    const d = new Date(repYear, repMonth - 1, 1); const y = d.getFullYear(), m = d.getMonth();
    const pt = cg.filter(t => { const td = new Date(t.deadline); return td.getFullYear() === y && td.getMonth() === m; });
    const total = pt.length, done = pt.filter(t => isCompletedStatus(t.status)).length, over = pt.filter(t => t.status === "overdue").length, completedLate = pt.filter(t => t.status === "completed_late").length;
    return { total, done, over, completedLate, rate: total ? Math.round(done / total * 100) : 0, totalW: sumW(pt), doneW: sumW(pt.filter(t => isCompletedStatus(t.status))), label: `T${m + 1}/${y}` };
  }, [cg, repYear, repMonth]);
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
  // Miễn phạt trễ khách quan: việc completed_late được đánh dấu → coi như ĐÚNG HẠN (completed); việc overdue
  // được đánh dấu → LOẠI khỏi mẫu số (không tính là quá hạn, cũng không tính là hoàn thành). Áp cho cả điểm
  // cá nhân lẫn điểm điều hành. Pseudo-task (hỗ trợ/dự án/phối hợp) không có cờ này nên không ảnh hưởng.
  const applyExcuse = arr => arr.map(t => t.late_excused ? (t.status === "completed_late" ? { ...t, status: "completed" } : { ...t, status: "__excused" }) : t).filter(t => t.status !== "__excused");

  const calcMonthPerf = (empId, year, month) => {
    const ym = `${year}|${month}`;
    const et = applyExcuse(perfIndex.byEid.get(`${empId}|${ym}`) || []);
    // Điểm cá nhân tính bằng công thức thuần trong scoring.js (nguồn duy nhất, có test). Đủ ĐK: resolved ≥ 5.
    // Người <5 việc đến hạn vẫn ra điểm để làm "điểm tham khảo", nhưng cờ eligible=false → không xếp hạng/chốt sổ.
    const s = staffScore(et);
    const etWeight = sumW(et);
    const completionRate = etWeight ? Math.round(s.done / etWeight * 100) : 0;
    // Task phối hợp trong tháng (đã cộng ½ trọng số vào et qua collabPseudoTasks; đây chỉ để hiển thị thống kê riêng)
    const collabTasks = perfIndex.byCollab.get(`${empId}|${ym}`) || [];
    const collabDone = sumW(collabTasks.filter(t => isCompletedStatus(t.status)));
    const collabTotal = sumW(collabTasks);
    return { total: etWeight, done: s.done, onTime: s.onTime, completedLate: s.completedLate, over: s.over, resolved: s.resolved, completionRate, collabTotal, collabDone, perfScore: s.perfScore, eligible: s.eligible, breakdown: s.breakdown };
  };

  const repEmpData = useMemo(() => (employees || []).filter(e => !MANAGER_EMP_ROLES.includes(e.role) && !e.no_kpi).map(emp => {
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
    // ── #5 Chỉ số CHỦ ĐỘNG (thông tin tham khảo, KHÔNG tính vào điểm 0–100) ──
    // Đo mức chủ động qua tỷ lệ việc hoàn thành SỚM hạn (xong trước hạn ≥1 ngày) và mức tham gia phối hợp.
    const myDone = cg.filter(t => t.eid === empId && t.status === "completed" && t.completed_at && t.deadline);
    let early = 0;
    for (const t of myDone) { const cd = new Date(t.completed_at); const dl = new Date(t.deadline); dl.setHours(23, 59, 59, 999); if (!isNaN(cd) && !isNaN(dl) && (dl - cd) / 86400000 >= 1) early++; }
    const proactive = { doneOnTime: myDone.length, early, earlyRate: myDone.length ? Math.round(early / myDone.length * 100) : 0, collabW: cur.collabTotal || 0 };
    // TV6 — Chân dung năng lực: tỷ lệ đúng hạn + chất lượng theo LOẠI việc (thường / định kỳ) từ lịch sử.
    const myResolved = cg.filter(t => t.eid === empId && (t.status === "completed" || t.status === "completed_late" || t.status === "overdue"));
    const skillDefs = [{ label: "Nhiệm vụ thường", m: t => !t.template_id }, { label: "Nhiệm vụ định kỳ", m: t => !!t.template_id }];
    const skills = skillDefs.map(sd => { const arr = myResolved.filter(sd.m); const onTime = arr.filter(t => t.status === "completed").length; const rated = arr.filter(t => RATING[t.rating]); return { label: sd.label, resolved: arr.length, onTimeRate: arr.length ? Math.round(onTime / arr.length * 100) : null, avgRating: rated.length ? Math.round(rated.reduce((s, t) => s + RATING[t.rating].score, 0) / rated.length * 10) / 10 : null }; }).filter(s => s.resolved > 0);
    return { emp, cur, trend, open, openCount: open.length, openW, lateReasons, lateTotal: myLate.length, onTimeRate, proactive, skills };
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
    if (!emp) return { dept: null, resolvedW: 0, doneW: 0, onTimeW: 0, lateW: 0, overW: 0, onTimeRate: 0, empCount: 0, perHead: 0, perfScore: 0, eligible: false, breakdown: null };
    const dept = emp.dept;
    const dt = applyExcuse(cg.filter(t => { if (t.dept !== dept) return false; const d = new Date(t.deadline); return d.getFullYear() === year && d.getMonth() === month; }));
    const empCount = (employees || []).filter(e => e.dept === dept && !e.no_kpi).length || 1;
    // Điểm điều hành tính bằng công thức thuần managerScore (nguồn duy nhất, có test): kết quả cả phòng + khối lượng/người.
    const m = managerScore(dt, empCount);
    return { dept, empCount, ...m };
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
    }).filter(e => e.total > 0 && !MANAGER_EMP_ROLES.includes(e.role) && !e.no_kpi);

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
    const totals = (employees || []).filter(e => e.dept === emp.dept && !e.no_kpi).map(e => calcMonthPerf(e.id, y, m).total).filter(v => v > 0);
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

  const dleft = (d) => { if (!d) return 99999; const dd = new Date(d); if (isNaN(dd)) return 99999; dd.setHours(0, 0, 0, 0); return Math.ceil((dd - today) / 86400000); };

  // ── ĐỘ TIN CẬY của mỗi người từ LỊCH SỬ (dùng cho dự báo rủi ro & gợi ý người nhận) ──
  // onTimeRate = tỷ lệ việc hoàn thành đúng hạn trên tổng việc đã đến hạn; avgDays = thời gian TB thực tế hoàn thành.
  const empReliability = useMemo(() => {
    const m = {};
    for (const t of cg) {
      if (!t.eid) continue;
      const st = t.status;
      if (st === "completed" || st === "completed_late" || st === "overdue") {
        const e = m[t.eid] || (m[t.eid] = { onTime: 0, resolved: 0, ratingSum: 0, ratingN: 0, durSum: 0, durN: 0 });
        e.resolved++; if (st === "completed") e.onTime++;
        if (RATING[t.rating]) { e.ratingSum += RATING[t.rating].score; e.ratingN++; }
        if (t.completed_at && t.created) { const cd = new Date(t.completed_at), cr = new Date(t.created); if (!isNaN(cd) && !isNaN(cr) && cd >= cr) { e.durSum += (cd - cr) / 86400000; e.durN++; } }
      }
    }
    const out = {};
    for (const [eid, v] of Object.entries(m)) out[eid] = { onTimeRate: v.resolved ? Math.round(v.onTime / v.resolved * 100) : null, resolved: v.resolved, avgRating: v.ratingN ? Math.round(v.ratingSum / v.ratingN * 10) / 10 : null, avgDays: v.durN ? Math.round(v.durSum / v.durN * 10) / 10 : null };
    return out;
  }, [cg]);

  // ── DỰ BÁO RỦI RO TRỄ cho 1 việc đang mở (chưa quá hạn): kết hợp "tiến độ so với thời gian đã trôi" +
  // lịch sử đúng hạn của người thực hiện + độ gấp + ưu tiên → mức Cao / TB / Thấp ──
  const riskOf = (t) => {
    if (t.status === "overdue") return { level: "overdue", score: 100 };
    if (isCompletedStatus(t.status) || t.completed || t.completion_requested) return { level: "none", score: 0 };
    const dl = dleft(t.deadline);
    if (dl > 7) return { level: "low", score: 0 };
    let timeRatio = 0.5;
    const cr = t.created ? new Date(t.created) : null, de = t.deadline ? new Date(t.deadline) : null;
    if (cr && de && !isNaN(cr) && !isNaN(de) && de > cr) timeRatio = Math.min(1, Math.max(0, (today - cr) / (de - cr)));
    const deficit = timeRatio * 100 - (t.progress || 0);         // >0: đang chậm so với lịch
    const rel = empReliability[t.eid];
    const onTime = rel && rel.onTimeRate != null ? rel.onTimeRate : 70;
    let score = deficit + (100 - onTime) * 0.4 + (dl <= 1 ? 20 : 0) + (t.prio === "high" ? 10 : t.prio === "low" ? -10 : 0);
    const level = score >= 45 ? "high" : score >= 20 ? "medium" : "low";
    return { level, score: Math.round(score) };
  };

  // ── GY1 SỨC KHỎE DỮ LIỆU: điểm/báo cáo chỉ đáng tin khi dữ liệu được nhập đầy đủ, kịp thời ──
  // Theo phạm vi quyền xem (TP thấy phòng, BGĐ thấy toàn đơn vị). 3 nhóm cần chấn chỉnh:
  const dataHealth = useMemo(() => {
    const daysSince = d => { if (!d) return 0; const dd = new Date(d); if (isNaN(dd)) return 0; dd.setHours(0, 0, 0, 0); return Math.floor((today - dd) / 86400000); };
    const overdueNoReason = computed.filter(t => t.status === "overdue" && !t.late_reason && !t.late_excused);       // quá hạn chưa nêu lý do
    const pendingLong = computed.filter(t => t.status === "pending_approval" && pendingApprovalDays(t) >= 2);        // chờ duyệt/chấm ≥2 ngày (quản lý chậm)
    const stale = computed.filter(t => !t.completed && !t.completion_requested && !isCompletedStatus(t.status) && (t.progress || 0) === 0 && daysSince(t.created) >= 7); // mở >7 ngày, tiến độ 0%
    return { overdueNoReason, pendingLong, stale, total: overdueNoReason.length + pendingLong.length + stale.length };
  }, [computed, today]);

  // ── TV5 PHÂN TÍCH NGUYÊN NHÂN TRỄ THEO MẪU: tìm quy luật & khuyến nghị (không chỉ đếm) ──
  const lateInsights = useMemo(() => {
    const late = computed.filter(t => t.status === "completed_late" || t.status === "overdue");
    const out = [];
    if (late.length < 3) return out;
    const withReason = late.filter(t => t.late_reason);
    if (withReason.length >= 2) {
      const counts = {}; withReason.forEach(t => counts[t.late_reason] = (counts[t.late_reason] || 0) + 1);
      const [val, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      const label = LATE_REASONS.find(r => r.value === val)?.label || val;
      const rec = /thông tin|tài liệu/i.test(label) ? " Nên cải thiện khâu cung cấp thông tin/tài liệu đầu vào." : /phối hợp|đơn vị/i.test(label) ? " Nên rà soát khâu phối hợp giữa các bộ phận." : "";
      out.push({ icon: "📌", text: `Nguyên nhân trễ phổ biến nhất: "${label}" (${Math.round(n / withReason.length * 100)}% số việc trễ có khai lý do).${rec}` });
    }
    const endMonth = late.filter(t => { const d = new Date(t.deadline); return !isNaN(d) && d.getDate() >= 21; }).length;
    const pctEnd = Math.round(endMonth / late.length * 100);
    if (pctEnd >= 50) out.push({ icon: "📅", text: `${pctEnd}% việc trễ có hạn rơi vào CUỐI THÁNG (ngày 21+). Nên dàn đều tiến độ trong tháng thay vì dồn cuối kỳ.` });
    const byEid = {}; late.forEach(t => { if (t.eid) byEid[t.eid] = (byEid[t.eid] || 0) + 1; });
    const worst = Object.entries(byEid).sort((a, b) => b[1] - a[1])[0];
    if (worst && worst[1] >= 3) { const nm = (employees || []).find(e => e.id === worst[0])?.name; if (nm) out.push({ icon: "👤", text: `${nm} có nhiều việc trễ nhất (${worst[1]} việc). Cân nhắc giảm tải hoặc hỗ trợ thêm.` }); }
    return out;
  }, [computed, employees]);

  // ── TV1 VIỆC NGUY CƠ TRỄ (thang xác suất): chưa quá hạn nhưng khả năng trễ Cao/TB theo riskOf ──
  // Thông minh hơn quy tắc cứng cũ: 1 việc 60% tiến độ nhưng hạn ngày mai + người hay trễ vẫn bị cảnh báo.
  const atRiskTasks = useMemo(() => computed
    .filter(t => !t.completed && !t.completion_requested && !isCompletedStatus(t.status) && t.status !== "overdue")
    .map(t => ({ ...t, __risk: riskOf(t) }))
    .filter(x => x.__risk.level === "high" || x.__risk.level === "medium")
    .sort((a, b) => b.__risk.score - a.__risk.score), [computed, today, empReliability]);

  // ── #7 BẢN TIN TUẦN (7 ngày qua) theo phạm vi quyền xem ──
  const weeklyDigest = useMemo(() => {
    const wk = new Date(today); wk.setDate(wk.getDate() - 7);
    let newly = 0, done = 0;
    for (const t of computed) {
      if (t.created && !isNaN(new Date(t.created)) && new Date(t.created) >= wk) newly++;
      if (isCompletedStatus(t.status) && t.completed_at && !isNaN(new Date(t.completed_at)) && new Date(t.completed_at) >= wk) done++;
    }
    return { newly, done, nearly: computed.filter(t => t.status === "nearly_due").length, overdue: computed.filter(t => t.status === "overdue").length };
  }, [computed, today]);

  // ── #2 CẢNH BÁO XU HƯỚNG (BGĐ): phòng đi xuống 3 tháng liên tiếp + nhân viên rớt điểm mạnh vs tháng trước ──
  const watchList = useMemo(() => {
    const alerts = [];
    const y = today.getFullYear(), m = today.getMonth();
    const monthRate = (dept, yy, mm) => { const mt = cg.filter(t => { if (t.dept !== dept) return false; const td = new Date(t.deadline); return td.getFullYear() === yy && td.getMonth() === mm; }); return mt.length ? Math.round(mt.filter(t => isCompletedStatus(t.status)).length / mt.length * 100) : null; };
    for (const d of DEPTS) {
      const seq = [2, 1, 0].map(i => { const dd = new Date(y, m - i, 1); return monthRate(d, dd.getFullYear(), dd.getMonth()); });
      if (seq.every(v => v != null) && seq[0] > seq[1] && seq[1] > seq[2]) alerts.push({ kind: "dept_down", dept: d, detail: `Tỷ lệ HT giảm 3 tháng liên tiếp: ${seq[0]}% → ${seq[1]}% → ${seq[2]}%`, drop: seq[0] - seq[2] });
    }
    const prev = new Date(y, m - 1, 1); const py = prev.getFullYear(), pm = prev.getMonth();
    for (const emp of (employees || [])) {
      if (emp.no_kpi) continue;
      const cur = calcMonthPerf(emp.id, y, m), pr = calcMonthPerf(emp.id, py, pm);
      if (cur.eligible && pr.eligible && (pr.perfScore - cur.perfScore) >= 15) alerts.push({ kind: "emp_down", dept: emp.dept, name: emp.name, detail: `Điểm rớt ${pr.perfScore - cur.perfScore}đ so tháng trước (${pr.perfScore} → ${cur.perfScore})`, drop: pr.perfScore - cur.perfScore });
    }
    return alerts.sort((a, b) => b.drop - a.drop);
  }, [cg, employees, perfIndex, today]);

  // ── TV7 TÓM TẮT ĐIỀU HÀNH BẰNG LỜI (BGĐ): tự ghép các chỉ số & cảnh báo thành một đoạn "đọc là hiểu" ──
  // (Đặt SAU watchList/staffingAdvice/dataHealth vì phụ thuộc chúng — tránh lỗi truy cập trước khởi tạo.)
  const execNarrative = useMemo(() => {
    const rows = execDeptSummary.filter(d => d.empCount > 0);
    const totalTasks = rows.reduce((s, d) => s + d.total, 0);
    if (totalTasks === 0) return "";
    const doneAll = rows.reduce((s, d) => s + d.done, 0);
    const overdueAll = rows.reduce((s, d) => s + d.overdue, 0);
    const rate = totalTasks ? Math.round(doneAll / totalTasks * 100) : 0;
    const sorted = [...rows].sort((a, b) => b.rate - a.rate);
    const best = sorted[0], worst = sorted[sorted.length - 1];
    const parts = [`Kỳ đang xem: ${totalTasks} nhiệm vụ, tỷ lệ hoàn thành ${rate}%${overdueAll > 0 ? `, còn ${overdueAll} việc quá hạn` : ""}.`];
    if (best && worst && best.dept !== worst.dept) parts.push(`Phòng ${best.dept} dẫn đầu (${best.rate}%), ${worst.dept} thấp nhất (${worst.rate}%).`);
    if (watchList && watchList.length) { const dd = watchList.filter(a => a.kind === "dept_down"), ee = watchList.filter(a => a.kind === "emp_down"); if (dd.length) parts.push(`⚠️ ${dd.map(x => x.dept).join(", ")} đang có xu hướng đi xuống nhiều tháng.`); if (ee.length) parts.push(`${ee.length} nhân viên rớt điểm mạnh so tháng trước.`); }
    if (staffingAdvice && staffingAdvice.length) { const ov = staffingAdvice.filter(x => x.level === "over").map(x => x.dept), un = staffingAdvice.filter(x => x.level === "under").map(x => x.dept); if (ov.length) parts.push(`Gợi ý điều phối: ${ov.join(", ")} có dấu hiệu thiếu người${un.length ? `, ${un.join(", ")} có thể dư người` : ""}.`); else if (un.length) parts.push(`${un.join(", ")} có thể đang dư người.`); }
    if (dataHealth && dataHealth.total > 0) { const bits = []; if (dataHealth.overdueNoReason.length) bits.push(`${dataHealth.overdueNoReason.length} việc quá hạn chưa nêu lý do`); if (dataHealth.pendingLong.length) bits.push(`${dataHealth.pendingLong.length} việc chờ duyệt lâu`); if (dataHealth.stale.length) bits.push(`${dataHealth.stale.length} việc bỏ hoang`); if (bits.length) parts.push(`Cần chấn chỉnh dữ liệu: ${bits.join(", ")}.`); }
    return parts.join(" ");
  }, [execDeptSummary, watchList, staffingAdvice, dataHealth]);

  return {
    repMonth, setRepMonth, repYear, setRepYear, repTab, setRepTab, rankYear, setRankYear,
    execDeptSummary, execMonth, setExecMonth, execYear, setExecYear, staffingAdvice, empProfile, managerBoard, managerLeaderboard, repTasks, repStats, repStatsPrev, repDeptData, repEmpData, repMonthTrend, leaderboard,
    lateReasonStats, overloadedEmps, myTrend, myTasks, myWorkList, myWorkloadCompare, myDoneList, atRiskTasks, weeklyDigest, watchList, dataHealth,
    empReliability, execNarrative, lateInsights,
    calcMonthPerf, managerPerf, // dùng cho "chốt sổ" điểm tháng vào bảng monthly_scores (nhân viên theo calcMonthPerf, quản lý theo managerPerf)
  };
}
