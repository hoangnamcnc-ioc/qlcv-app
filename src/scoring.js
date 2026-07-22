// ─────────────────────────────────────────────────────────────────────────────
// CÔNG THỨC ĐIỂM THUẦN (không phụ thuộc React) — nguồn DUY NHẤT cho điểm hiệu suất.
// Tách khỏi useReports.js để (1) tránh trùng lặp công thức, (2) kiểm thử tự động độc lập.
// Mọi thay đổi công thức chỉ sửa Ở ĐÂY; useReports.js chỉ gọi lại. Có bộ test scoring.test.js đi kèm.
// ─────────────────────────────────────────────────────────────────────────────
import { RATING, LATE_COMPLETION_PENALTY } from "./constants.js";

// Trọng số 1 "việc": mặc định 1; nhiệm vụ định kỳ (ngày 0.25 … năm 3) và hỗ trợ (khó/TB/nhanh) gắn sẵn t.weight.
export const w = t => t.weight ?? 1;
export const sumW = arr => Math.round(arr.reduce((s, t) => s + w(t), 0) * 100) / 100;
// Điểm chất lượng của 1 việc theo mức nghiệm thu (chưa đánh giá = Trung bình = 2). Thang RATING: 0..4.
const ratingScore = t => (RATING[t.rating] ? RATING[t.rating].score : 2);

// ── ĐIỂM HIỆU SUẤT CÁ NHÂN ──────────────────────────────────────────────────
// items = danh sách việc ĐÃ ĐẾN HẠN trong tháng của 1 người, mỗi việc { status, rating, weight }.
// status: "completed" (đúng hạn), "completed_late" (HT trễ), "overdue" (quá hạn chưa xong).
//   Điểm = Thời hạn(60) + Chất lượng(40) − Phạt(2đ/việc trễ&quá hạn) + Thưởng khối lượng(+1đ/việc vượt 15, tối đa 10).
//   Chỉ tính trên việc đã đến hạn; đủ điều kiện xếp hạng khi resolved ≥ 5.
export function staffScore(items) {
  const onTimeTasks = items.filter(t => t.status === "completed");
  const onTime = sumW(onTimeTasks);
  const completedLate = sumW(items.filter(t => t.status === "completed_late"));
  const over = sumW(items.filter(t => t.status === "overdue"));
  const done = Math.round((onTime + completedLate) * 100) / 100;
  const resolved = Math.round((onTime + completedLate + over) * 100) / 100;
  const eligible = resolved >= 5;
  let perfScore = 0, breakdown = null;
  if (resolved > 0) {
    const timeliness = (onTime * 60 + completedLate * 30) / resolved;                          // ① 0..60
    const qualitySum = onTimeTasks.reduce((s, t) => s + ratingScore(t) * w(t), 0);
    const quality = qualitySum / (resolved * 4) * 40;                                           // ② 0..40
    const penalty = (over + completedLate) * LATE_COMPLETION_PENALTY;                           // ③ phạt tuyệt đối
    const workloadBonus = Math.max(0, Math.min((resolved - 15) * 1, 10));                       // ④ thưởng khối lượng cá nhân
    perfScore = Math.max(0, Math.min(100, Math.round(timeliness + quality - penalty + workloadBonus)));
    breakdown = { timeliness: Math.round(timeliness * 10) / 10, quality: Math.round(quality * 10) / 10, penalty, workloadBonus };
  }
  return { onTime, completedLate, over, done, resolved, eligible, perfScore, breakdown };
}

// ── ĐIỂM ĐIỀU HÀNH (Trưởng/Phó phòng) ───────────────────────────────────────
// items = danh sách việc CẢ PHÒNG đã đến hạn trong tháng; empCount = số người của phòng.
//   Điểm = Đúng hạn phòng(60) + Chất lượng phòng(40) − Tồn đọng quá hạn(tỷ lệ, tối đa 10)
//        + Thưởng khối lượng điều hành theo BÌNH QUÂN ĐẦU NGƯỜI (>10/người mới thưởng, tối đa +10 khi ≥20/người).
export function managerScore(items, empCount) {
  const onTimeTasks = items.filter(t => t.status === "completed");
  const onTimeW = sumW(onTimeTasks);
  const lateW = sumW(items.filter(t => t.status === "completed_late"));
  const overW = sumW(items.filter(t => t.status === "overdue"));
  const doneW = Math.round((onTimeW + lateW) * 100) / 100;
  const resolvedW = Math.round((onTimeW + lateW + overW) * 100) / 100;
  const eligible = resolvedW >= 5;
  const ec = empCount || 1;
  const perHead = resolvedW / ec;
  const onTimeRate = resolvedW > 0 ? Math.round(onTimeW / resolvedW * 100) : 0;
  let perfScore = 0, breakdown = null;
  if (resolvedW > 0) {
    const timeliness = (onTimeW * 60 + lateW * 30) / resolvedW;                                 // ① 0..60
    const qualitySum = onTimeTasks.reduce((s, t) => s + ratingScore(t) * w(t), 0);
    const quality = qualitySum / (resolvedW * 4) * 40;                                          // ② 0..40
    const penalty = Math.round(overW / resolvedW * 10 * 10) / 10;                               // ③ tỷ lệ tồn đọng, 0..10
    const mgmtBonus = Math.max(0, Math.min(perHead - 10, 10));                                  // ④ khối lượng bình quân/người
    perfScore = Math.max(0, Math.min(100, Math.round(timeliness + quality - penalty + mgmtBonus)));
    breakdown = { timeliness: Math.round(timeliness * 10) / 10, quality: Math.round(quality * 10) / 10, penalty, mgmtBonus: Math.round(mgmtBonus * 10) / 10 };
  }
  return { onTimeW, lateW, overW, doneW, resolvedW, eligible, perHead: Math.round(perHead * 10) / 10, onTimeRate, perfScore, breakdown };
}
