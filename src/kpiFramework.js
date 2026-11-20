// KHUNG KPI CỦA ĐƠN VỊ (tài liệu "Khung xây dựng KPI") — các hàm thuần, có test.
//   KPI = Điểm tiêu chí chung (tối đa 30) + Điểm đánh giá nhiệm vụ × 70%
//   Điểm đánh giá nhiệm vụ = trung bình 3 tỷ lệ tính trên số lượng QUY ĐỔI (hệ số quy đổi × số lượng):
//     số lượng  = hoàn thành / được giao
//     tiến độ   = Σ(hoàn thành × (1 − 25% × số ngày chậm)) / được giao
//     chất lượng = Σ(hoàn thành × (1 − 25% × số lần phải làm lại)) / được giao
//   Xếp loại: ≥90 Xuất sắc · 70–<90 Tốt · 50–<70 Hoàn thành · <50 Không hoàn thành.

// ── Tiêu chí chung: 3 phần × tối đa 10 điểm; chấm 3 lượt (cá nhân → lãnh đạo phòng → lãnh đạo Trung tâm) ──
export const COMMON_SECTIONS = [
  { k: "a", label: "I. Phẩm chất chính trị, đạo đức, ý thức kỷ luật", max: 10 },
  { k: "b", label: "II. Năng lực chuyên môn, tinh thần trách nhiệm, thái độ phục vụ, phối hợp", max: 10 },
  { k: "c", label: "III. Năng lực đổi mới, sáng tạo, dám nghĩ dám làm", max: 10 },
];
export const COMMON_ROUNDS = [["self", "Cá nhân tự chấm"], ["dept", "Lãnh đạo phòng chấm"], ["center", "Lãnh đạo Trung tâm chấm"]];
const num = v => (v === "" || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null);
// Tổng 1 lượt chấm {a,b,c}; null nếu chưa nhập gì. Mỗi phần được kẹp trong [0, max].
export const roundTotal = r => {
  if (!r) return null;
  let any = false, sum = 0;
  for (const s of COMMON_SECTIONS) { const v = num(r[s.k]); if (v != null) { any = true; sum += Math.max(0, Math.min(v, s.max)); } }
  return any ? Math.round(sum * 100) / 100 : null;
};
// Điểm tiêu chí chung CHÍNH THỨC = lượt cao nhất đã có (Trung tâm > Phòng > Cá nhân). row = {self,dept,center}.
export const commonFinal = row => {
  for (const [k] of [...COMMON_ROUNDS].reverse()) { const t = roundTotal(row?.[k]); if (t != null) return { total: t, from: k }; }
  return null;
};

// ── Công thức chính ──
// items: [{ status: "completed"|"completed_late"|"overdue", weight, lateDays, rework }] — việc ĐÃ ĐẾN HẠN trong tháng.
// common: kết quả commonFinal hoặc null.
export function frameworkScore(items, cfg, common) {
  const w = t => t.weight ?? 1;
  const sum = f => Math.round(items.reduce((s, t) => s + f(t), 0) * 100) / 100;
  const isDone = t => t.status === "completed" || t.status === "completed_late";
  const assigned = sum(w);
  const done = sum(t => (isDone(t) ? w(t) : 0));
  const onTime = sum(t => (t.status === "completed" ? w(t) : 0));
  const completedLate = sum(t => (t.status === "completed_late" ? w(t) : 0));
  const over = sum(t => (t.status === "overdue" ? w(t) : 0));
  const eligible = assigned >= cfg.minResolved;
  if (assigned <= 0) return { onTime, completedLate, over, done, resolved: assigned, eligible, perfScore: 0, breakdown: null };
  const late = t => (t.status === "completed_late" ? Math.max(1, Math.round(t.lateDays || 1)) : 0);
  const progW = sum(t => (isDone(t) ? w(t) * Math.max(0, 1 - cfg.lateDayPenalty * late(t)) : 0));
  const qualW = sum(t => (isDone(t) ? w(t) * Math.max(0, 1 - cfg.reworkPenalty * Math.max(0, t.rework || 0)) : 0));
  const qty = done / assigned * 100, prog = progW / assigned * 100, qual = qualW / assigned * 100;
  const evalPct = (qty + prog + qual) / 3;
  const entered = !!common;
  // Chưa có điểm tiêu chí chung → điểm TẠM TÍNH quy về thang 100 từ phần nhiệm vụ (không bị trừ oan 30 điểm).
  const kpi = entered ? common.total + evalPct * (cfg.evalWeight / 100) : evalPct;
  const r1 = x => Math.round(x * 10) / 10;
  return {
    onTime, completedLate, over, done, resolved: assigned, eligible,
    perfScore: Math.max(0, Math.min(100, Math.round(kpi))),
    breakdown: { mode: "framework", qty: r1(qty), progress: r1(prog), quality: r1(qual), evalPct: r1(evalPct), common: entered ? common.total : null, commonFrom: entered ? common.from : null, provisional: !entered, evalWeight: cfg.evalWeight },
  };
}

export const gradeFor = (score, mins) => (score >= mins.excellent ? "excellent" : score >= mins.good ? "good" : score >= mins.pass ? "pass" : "fail");
export const GRADE_LABEL = { excellent: "Hoàn thành xuất sắc nhiệm vụ", good: "Hoàn thành tốt nhiệm vụ", pass: "Hoàn thành nhiệm vụ", fail: "Không hoàn thành nhiệm vụ" };

// ── Hệ số quy đổi của 1 sản phẩm (tài liệu, sheet "Cách tính") ──
// giờ công × hệ số độ khó (TB 5 tiêu chí, 1,0–5,0) = tổng điểm; hệ số quy đổi = tổng điểm / 5 (làm tròn 1 chữ số).
export const DIFFICULTY_CRITERIA = [
  "Trình độ, năng lực yêu cầu", "Mức độ phối hợp (số lượng đơn vị)", "Rủi ro sai sót / pháp lý", "Tính sáng tạo, nghiên cứu", "Phạm vi ảnh hưởng",
];
export const STANDARD_POINT = 5;
export function difficultyCoef(hours, scores) {
  const h = Number(hours);
  const s = (scores || []).map(Number);
  if (!(h > 0) || s.length !== 5 || s.some(x => !Number.isFinite(x) || x < 1 || x > 5)) return null;
  const avg = Math.round(s.reduce((a, b) => a + b, 0) / 5 * 100) / 100;
  const points = Math.round(h * avg * 100) / 100;
  return { avg, points, coef: Math.round(points / STANDARD_POINT * 10) / 10 };
}
