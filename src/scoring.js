// ─────────────────────────────────────────────────────────────────────────────
// ĐIỂM HIỆU SUẤT (KPI) — nguồn DUY NHẤT; công thức theo KHUNG KPI CỦA ĐƠN VỊ (xem kpiFramework.js).
// useReports.js chỉ gọi lại các hàm ở đây. Có bộ test scoring.test.js / kpiConfig.test.js đi kèm.
// ─────────────────────────────────────────────────────────────────────────────
import { KPI_DEFAULT } from "./kpiConfig.js";
import { frameworkScore } from "./kpiFramework.js";

// Trọng số = hệ số quy đổi của sản phẩm (mặc định 1; nhiệm vụ định kỳ/hỗ trợ gắn sẵn t.weight).
export const w = t => t.weight ?? 1;
export const sumW = arr => Math.round(arr.reduce((s, t) => s + w(t), 0) * 100) / 100;

// Điểm cá nhân. items = việc ĐÃ ĐẾN HẠN trong tháng { status, weight, lateDays, rework }; common = điểm tiêu chí chung (hoặc null).
export function staffScore(items, cfg = KPI_DEFAULT, common = null) {
  return frameworkScore(items, cfg, common);
}

// Điểm điều hành (Trưởng/Phó phòng): cùng công thức, tính trên việc CẢ PHÒNG đã đến hạn; kèm thống kê khối lượng/người.
export function managerScore(items, empCount, approve, cfg = KPI_DEFAULT, common = null) {
  const s = frameworkScore(items, cfg, common);
  const ec = empCount || 1;
  const onTimeRate = s.resolved > 0 ? Math.round(s.onTime / s.resolved * 100) : 0;
  const slow = approve && approve.totalReq > 0 ? { slowCount: approve.slowCount || 0, reqCount: approve.totalReq } : { slowCount: 0, reqCount: 0 };
  return {
    onTimeW: s.onTime, lateW: s.completedLate, overW: s.over, doneW: s.done, resolvedW: s.resolved, eligible: s.eligible,
    perHead: Math.round(s.resolved / ec * 10) / 10, onTimeRate, perfScore: s.perfScore,
    breakdown: s.breakdown ? { ...s.breakdown, ...slow } : null,
  };
}
