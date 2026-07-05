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

export default function useReports({ computed, employees, currentUser, overloadThreshold, projects, supportCases }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  // ── Trường hợp hỗ trợ người dùng nền tảng số dùng chung → quy thành "việc hoàn thành" theo trọng số độ khó,
  // tính vào tháng theo ngày ghi nhận (created). Luôn coi là hoàn thành đúng hạn vì bản chất đã xử lý xong khi ghi nhận ──
  const supportPseudoTasks = useMemo(() => (supportCases || []).filter(c => c.eid && c.created).map(c => ({
    id: `support_${c.id}`, eid: c.eid, deadline: c.created, status: "completed", rating: "tot", collab_eids: "[]",
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
    const overloaded = deptEmpsList.filter(e => computed.filter(t => t.eid === e.id && !isCompletedStatus(t.status)).length >= overloadThreshold).length;
    const lead = deptEmpsList.find(e => ["Trưởng phòng", "TP. HCTH"].includes(e.role));
    return { dept: d, total: dt.length, over, overdue, completedLate, nd, done, rate, empCount: deptEmpsList.length, overloaded, lead: lead?.name || "—" };
  }), [computed, employees, overloadThreshold]);

  const repTasks = useMemo(() => computed.filter(t => { const d = new Date(t.deadline); return d.getFullYear() === repYear && d.getMonth() === repMonth; }), [computed, repYear, repMonth]);
  const repStats = useMemo(() => { const total = repTasks.length, done = repTasks.filter(t => isCompletedStatus(t.status)).length, over = repTasks.filter(t => t.status === "overdue").length, completedLate = repTasks.filter(t => t.status === "completed_late").length; return { total, done, over, completedLate, rate: total ? Math.round(done / total * 100) : 0 }; }, [repTasks]);
  const repDeptData = useMemo(() => DEPTS.map(d => { const dt = repTasks.filter(t => t.dept === d); const done = dt.filter(t => isCompletedStatus(t.status)).length; const over = dt.filter(t => t.status === "overdue").length; const completedLate = dt.filter(t => t.status === "completed_late").length; return { name: d, total: dt.length, done, over, completedLate, rate: dt.length ? Math.round(done / dt.length * 100) : 0 }; }), [repTasks]);

  // ── Vai trò phối hợp (collab_eids) trên việc ĐÃ HOÀN THÀNH được tính = 1/2 việc cho người phối hợp,
  // cộng thẳng vào tổng số việc/điểm chất lượng/thời hạn của họ (giống cách tính hỗ trợ ND/dự án ngân sách) —
  // không tính việc đang dở dang vì chưa có kết quả để đánh giá ──
  const collabPseudoTasks = useMemo(() => {
    const out = [];
    for (const t of computed) {
      if (!isCompletedStatus(t.status)) continue;
      for (const cid of parseJSON(t.collab_eids, [])) {
        if (cid === t.eid) continue; // tránh trùng nếu dữ liệu lỗi gán chính mình vào phối hợp
        out.push({ id: `collab_${t.id}_${cid}`, eid: cid, deadline: t.deadline, status: t.status, rating: t.rating, collab_eids: "[]", suspicious_completion: false, weight: 0.5 });
      }
    }
    return out;
  }, [computed]);

  // ── Index theo (nhân viên | năm | tháng) — dựng MỘT lần, tra cứu O(1) thay vì quét toàn bộ mỗi lần ──
  // byEid: việc mình chủ trì (đã gồm phối hợp weight 0.5) ; byCollab: đếm thô số việc phối hợp (chỉ để hiển thị badge)
  const perfIndex = useMemo(() => {
    const byEid = new Map(), byCollab = new Map();
    const push = (map, key, t) => { let a = map.get(key); if (!a) { a = []; map.set(key, a); } a.push(t); };
    for (const t of [...computed, ...projPseudoTasks, ...supportPseudoTasks, ...collabPseudoTasks]) {
      if (!t.deadline) continue;
      const d = new Date(t.deadline); if (isNaN(d)) continue;
      const ym = `${d.getFullYear()}|${d.getMonth()}`;
      push(byEid, `${t.eid}|${ym}`, t);
    }
    for (const t of computed) {
      if (!t.deadline) continue;
      const d = new Date(t.deadline); if (isNaN(d)) continue;
      const ym = `${d.getFullYear()}|${d.getMonth()}`;
      for (const cid of parseJSON(t.collab_eids, [])) push(byCollab, `${cid}|${ym}`, t);
    }
    return { byEid, byCollab };
  }, [computed, projPseudoTasks, supportPseudoTasks, collabPseudoTasks]);

  // ── Công thức tính điểm hiệu suất 1 THÁNG (dùng chung cho bảng "Hiệu suất tháng" và "Xếp hạng năm") ──
  // Mỗi "việc" có trọng số (weight, mặc định 1) — trường hợp hỗ trợ người dùng dùng weight phân số
  // (Khó=1, Trung bình=0.5, Nhanh=0.25) nên mọi phép đếm dùng tổng trọng số thay vì .length.
  const w = t => t.weight ?? 1;
  const sumW = arr => Math.round(arr.reduce((s, t) => s + w(t), 0) * 100) / 100;
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
    const eligible = etWeight >= 5;
    // Task phối hợp trong tháng
    const collabTasks = perfIndex.byCollab.get(`${empId}|${ym}`) || [];
    const collabDone = sumW(collabTasks.filter(t => isCompletedStatus(t.status)));
    const collabTotal = sumW(collabTasks);
    let perfScore = 0, breakdown = null;
    if (eligible) {
      // ① Điểm thời hạn (tối đa 60) — chưa có việc nào đến hạn xử lý xong thì tạm tính 0, tránh chia cho 0
      const timeliness = resolved > 0 ? (onTime * 60 + completedLate * 30) / resolved : 0;
      // ② Điểm chất lượng (tối đa 40)
      const qualitySum = onTimeTasks.reduce((s, t) => s + (RATING[t.rating] ? RATING[t.rating].score : 2) * w(t), 0);
      const quality = resolved > 0 ? qualitySum / (resolved * 4) * 40 : 0;
      // ③ Phạt trễ/quá hạn
      const penalty = (over + completedLate) * LATE_COMPLETION_PENALTY;
      // ④ Thưởng khối lượng
      const workloadBonus = Math.max(0, Math.min((resolved - 5) * 1, 10));
      perfScore = Math.max(0, Math.min(100, Math.round(timeliness + quality - penalty + workloadBonus)));
      // Lưu chi tiết để hiển thị "Vì sao điểm này?"
      breakdown = { timeliness: Math.round(timeliness * 10) / 10, quality: Math.round(quality * 10) / 10, penalty, workloadBonus };
    }
    return { total: etWeight, done, onTime, completedLate, over, resolved, completionRate, collabTotal, collabDone, perfScore, eligible, breakdown };
  };

  const repEmpData = useMemo(() => (employees || []).map(emp => {
    const m = calcMonthPerf(emp.id, repYear, repMonth);
    return { ...emp, ...m, perfScore: m.perfScore };
  }).filter(e => e.total > 0).sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1; // người đủ điều kiện hiện trước
    if (b.perfScore !== a.perfScore) return b.perfScore - a.perfScore;
    return b.done - a.done; // cùng điểm -> ai hoàn thành nhiều việc hơn xếp trên
  }), [employees, repYear, repMonth, computed, projPseudoTasks, supportPseudoTasks, collabPseudoTasks]);

  const repMonthTrend = useMemo(() => { const months = []; for (let i = 5; i >= 0; i--) { const d = new Date(repYear, repMonth - i, 1); const m = d.getMonth(), y = d.getFullYear(); const mt = computed.filter(t => { const td = new Date(t.deadline); return td.getFullYear() === y && td.getMonth() === m; }); months.push({ name: `T${m + 1}`, done: mt.filter(t => isCompletedStatus(t.status)).length, total: mt.length }); } return months; }, [computed, repYear, repMonth]);

  const leaderboard = useMemo(() => (employees || []).map(emp => {
    const monthly = [...Array(12)].map((_, m) => calcMonthPerf(emp.id, rankYear, m));
    const eligibleMonths = monthly.filter(m => m.eligible);
    const total = monthly.reduce((s, m) => s + m.total, 0);
    const done = monthly.reduce((s, m) => s + m.done, 0);
    const over = monthly.reduce((s, m) => s + (m.over || 0), 0);
    const completedLate = monthly.reduce((s, m) => s + (m.completedLate || 0), 0);
    const avgScore = eligibleMonths.length ? Math.round(eligibleMonths.reduce((s, m) => s + m.perfScore, 0) / eligibleMonths.length) : null;
    const collabTotal = monthly.reduce((s, m) => s + (m.collabTotal || 0), 0);
    const collabDone = monthly.reduce((s, m) => s + (m.collabDone || 0), 0);
    return { ...emp, total, done, completedLate, over, collabTotal, collabDone, eligibleMonths: eligibleMonths.length, score: avgScore, rate: total ? Math.round(done / total * 100) : 0, monthly };
  }).filter(e => e.total > 0).sort((a, b) => {
    const aHas = a.score !== null, bHas = b.score !== null;
    if (aHas !== bHas) return aHas ? -1 : 1;
    if (aHas && bHas && b.score !== a.score) return b.score - a.score;
    return b.rate - a.rate;
  }), [computed, employees, rankYear, projPseudoTasks, supportPseudoTasks, collabPseudoTasks]);

  const lateReasonStats = useMemo(() => { const lt = computed.filter(t => t.late_reason); const total = lt.length; return LATE_REASONS.map(r => { const tasksForReason = lt.filter(t => t.late_reason === r.value); return { ...r, count: tasksForReason.length, pct: total ? Math.round(tasksForReason.length / total * 100) : 0, tasks: tasksForReason }; }).filter(r => r.count > 0).sort((a, b) => b.count - a.count); }, [computed]);
  const overloadedEmps = useMemo(() => (employees || []).map(emp => { const active = computed.filter(t => t.eid === emp.id && !isCompletedStatus(t.status)); return { ...emp, activeCount: active.length }; }).filter(e => e.activeCount >= overloadThreshold), [employees, computed, overloadThreshold]);

  const myTrend = useMemo(() => { if (!currentUser?.employee_id) return []; const months = []; for (let i = 5; i >= 0; i--) { const d = new Date(today.getFullYear(), today.getMonth() - i, 1); const m = d.getMonth(), y = d.getFullYear(); const mt = computed.filter(t => { const td = new Date(t.deadline); return td.getFullYear() === y && td.getMonth() === m && (t.eid === currentUser.employee_id || parseJSON(t.collab_eids, []).includes(currentUser.employee_id)); }); months.push({ name: `T${m + 1}`, "Hoàn thành": mt.filter(t => isCompletedStatus(t.status)).length, "Tổng": mt.length }); } return months; }, [computed, currentUser]);
  const myTasks = useMemo(() => { if (!currentUser?.employee_id) return null; const my = computed.filter(t => t.eid === currentUser.employee_id || parseJSON(t.collab_eids, []).includes(currentUser.employee_id)); const done = my.filter(t => isCompletedStatus(t.status)).length, over = my.filter(t => t.status === "overdue").length, completedLate = my.filter(t => t.status === "completed_late").length, nd = my.filter(t => t.status === "nearly_due").length, active = my.filter(t => !isCompletedStatus(t.status)); return { total: my.length, done, over, completedLate, nd, rate: my.length ? Math.round(done / my.length * 100) : 0, pending: active.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)).slice(0, 3) }; }, [computed, currentUser]);

  return {
    repMonth, setRepMonth, repYear, setRepYear, repTab, setRepTab, rankYear, setRankYear,
    execDeptSummary, repTasks, repStats, repDeptData, repEmpData, repMonthTrend, leaderboard,
    lateReasonStats, overloadedEmps, myTrend, myTasks,
    calcMonthPerf, // dùng cho "chốt sổ" điểm tháng vào bảng monthly_scores (snapshot cố định, không đổi khi dữ liệu sống bị sửa)
  };
}
