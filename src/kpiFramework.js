// KHUNG KPI CỦA ĐƠN VỊ (tài liệu "Khung xây dựng KPI") — các hàm thuần, có test.
//   KPI = Điểm tiêu chí chung (tối đa 30) + Điểm đánh giá nhiệm vụ × 70%
//   Điểm đánh giá nhiệm vụ = trung bình 3 tỷ lệ tính trên số lượng QUY ĐỔI (hệ số quy đổi × số lượng):
//     số lượng  = hoàn thành / được giao
//     tiến độ   = Σ(hoàn thành × (1 − 25% × số ngày chậm)) / được giao
//     chất lượng = Σ(hoàn thành × hệ số chất lượng) / được giao, hệ số = (1−w)×(1 − 25% × số lần làm lại) + w×(mức nghiệm thu: Xuất sắc 100% · Tốt 75% · TB 50% · Kém 0%),
//                  w = trọng số mức nghiệm thu (mặc định 30%; chưa chấm mức = Tốt)
//   Xếp loại: ≥90 Xuất sắc · 70–<90 Tốt · 50–<70 Hoàn thành · <50 Không hoàn thành.

import { RATING } from "./constants.js";

import { COMMON_CRITERIA } from "./kpiCommonItems.js";
// ── Tiêu chí chung: 3 phần × tối đa 10 điểm; chấm 3 lượt (cá nhân → lãnh đạo phòng → lãnh đạo Trung tâm) ──
export const COMMON_SECTIONS = COMMON_CRITERIA.map(s => ({ k: s.k, label: `${s.no}. ${s.label}`, max: s.max, items: s.items }));
export const COMMON_ROUNDS = [["self", "Cá nhân tự chấm"], ["dept", "Lãnh đạo phòng chấm"], ["center", "Lãnh đạo Trung tâm chấm"]];
const num = v => (v === "" || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null);
// Điểm 1 phần (I/II/III) của 1 lượt chấm: ưu tiên cộng các tiêu chí con r.items[id] (kẹp theo điểm tối đa từng mục);
// không có thì dùng tổng phần r[k] (dữ liệu cũ). null nếu chưa nhập.
export const sectionScore = (r, s) => {
  if (r && r.items) {
    let any = false, sum = 0;
    for (const it of s.items) { const v = num(r.items[it.id]); if (v != null) { any = true; sum += Math.max(0, Math.min(v, it.max)); } }
    if (any) return Math.round(sum * 100) / 100;
  }
  const v = num(r?.[s.k]);
  return v == null ? null : Math.max(0, Math.min(v, s.max));
};
// Tổng 1 lượt chấm {items?,a,b,c}; null nếu chưa nhập gì.
export const roundTotal = r => {
  if (!r) return null;
  let any = false, sum = 0;
  for (const s of COMMON_SECTIONS) { const v = sectionScore(r, s); if (v != null) { any = true; sum += v; } }
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
  const raw = f => items.reduce((a, t) => a + f(t), 0); // không làm tròn để % tiến độ/chất lượng chính xác
  const progW = raw(t => (isDone(t) ? w(t) * Math.max(0, 1 - cfg.lateDayPenalty * late(t)) : 0));
  const rw = cfg.ratingWeight ?? 0;
  const ratingFactor = t => (RATING[t.rating] ? RATING[t.rating].score / 4 : 0.75); // chưa chấm mức = Tốt
  const qFactor = t => (1 - rw) * Math.max(0, 1 - cfg.reworkPenalty * Math.max(0, t.rework || 0)) + rw * ratingFactor(t);
  const qualW = raw(t => (isDone(t) ? w(t) * qFactor(t) : 0));
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
