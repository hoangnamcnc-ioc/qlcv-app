// Kiểm thử công thức KPI theo KHUNG ĐƠN VỊ (scoring.js + kpiFramework.js). Chạy: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { staffScore, managerScore, sumW } from "./scoring.js";
import { KPI_DEFAULT } from "./kpiConfig.js";
import { frameworkScore, roundTotal, commonFinal, difficultyCoef, gradeFor } from "./kpiFramework.js";

const mk = (n, status, extra = {}) => Array.from({ length: n }, () => ({ status, weight: 1, ...extra }));
const one = { ...KPI_DEFAULT, minResolved: 1 };

test("sumW cộng trọng số & làm tròn", () => {
  assert.equal(sumW([]), 0);
  assert.equal(sumW([{ weight: 2.5 }, { weight: 0.25 }, {}]), 3.75);
});

test("rỗng → 0 điểm, chưa đủ ĐK", () => {
  const s = staffScore([]);
  assert.equal(s.perfScore, 0); assert.equal(s.eligible, false); assert.equal(s.breakdown, null);
});

test("ví dụ trong tài liệu: 26 điểm chung + 92,44% × 70 ≈ 90,7", () => {
  // số lượng 100%, tiến độ 100%, chất lượng 77,3% (1436,6 / 1858,2) → TB 92,4%
  const grp = [{ status: "completed", weight: 1436.6, rework: 0 }, { status: "completed", weight: 421.6, rework: 4 }];
  const s = frameworkScore(grp, KPI_DEFAULT, { total: 26, from: "center" });
  assert.equal(s.breakdown.qty, 100); assert.equal(s.breakdown.progress, 100);
  assert.equal(s.breakdown.quality, 77.3);
  assert.equal(s.perfScore, 91);
});

test("tiến độ: mỗi ngày chậm trừ 25%; chất lượng: mỗi lần làm lại trừ 25%; việc quá hạn làm giảm số lượng", () => {
  const s = frameworkScore([{ status: "completed_late", weight: 4, lateDays: 2 }], one, null);
  assert.equal(s.breakdown.qty, 100); assert.equal(s.breakdown.progress, 50); assert.equal(s.breakdown.quality, 100);
  const r = frameworkScore([{ status: "completed", weight: 4, rework: 1 }], one, null);
  assert.equal(r.breakdown.quality, 75);
  const over = frameworkScore([{ status: "completed", weight: 1 }, { status: "overdue", weight: 1 }], one, null);
  assert.equal(over.breakdown.qty, 50);
});

test("chậm quá 4 ngày không âm điểm (kẹp 0)", () => {
  const s = frameworkScore([{ status: "completed_late", weight: 1, lateDays: 9 }], one, null);
  assert.equal(s.breakdown.progress, 0);
});

test("chưa có điểm tiêu chí chung → tạm tính thang 100; có điểm chung → cộng + 70%", () => {
  const items = mk(10, "completed");
  const t = staffScore(items, KPI_DEFAULT, null);
  assert.equal(t.perfScore, 100); assert.equal(t.breakdown.provisional, true);
  const f = staffScore(items, KPI_DEFAULT, { total: 24, from: "dept" });
  assert.equal(f.perfScore, 94); assert.equal(f.breakdown.provisional, false);
});

test("đủ điều kiện xếp hạng khi việc quy đổi ≥ minResolved", () => {
  assert.equal(staffScore(mk(4, "completed")).eligible, false);
  assert.equal(staffScore(mk(5, "completed")).eligible, true);
});

test("điểm điều hành dùng cùng công thức, kèm khối lượng/người", () => {
  const m = managerScore([...mk(8, "completed"), ...mk(2, "overdue")], 2, { totalReq: 4, slowCount: 1 }, KPI_DEFAULT, { total: 28, from: "center" });
  assert.equal(m.resolvedW, 10); assert.equal(m.perHead, 5); assert.equal(m.onTimeRate, 80);
  assert.equal(m.breakdown.reqCount, 4);
  assert.equal(m.perfScore, Math.round(28 + 80 * 0.7));
});

test("tiêu chí chung: 3 phần × 10, lượt cao nhất đã có là chính thức", () => {
  assert.equal(roundTotal({ a: 10, b: 9, c: 6 }), 25);
  assert.equal(roundTotal({ a: 15, b: 0, c: 0 }), 10);
  assert.equal(roundTotal({}), null);
  assert.deepEqual(commonFinal({ self: { a: 10, b: 10, c: 10 }, dept: { a: 8, b: 8, c: 8 } }), { total: 24, from: "dept" });
  assert.deepEqual(commonFinal({ self: { a: 9, b: 9, c: 9 }, dept: { a: 8, b: 8, c: 8 }, center: { a: 7, b: 7, c: 7 } }), { total: 21, from: "center" });
  assert.equal(commonFinal({}), null);
});

test("hệ số quy đổi: giờ × độ khó TB ÷ 5 (khớp ví dụ tài liệu)", () => {
  const d = difficultyCoef(96, [3.2, 2, 3.5, 3.5, 2.5]);
  assert.equal(d.avg, 2.94); assert.equal(d.points, 282.24); assert.equal(d.coef, 56.4);
  assert.equal(difficultyCoef(30, [3, 3, 3, 3, 3]).coef, 18);
  assert.equal(difficultyCoef(0, [3, 3, 3, 3, 3]), null);
  assert.equal(difficultyCoef(10, [3, 3, 3, 3, 9]), null);
});

test("xếp loại 90/70/50", () => {
  const m = { excellent: 90, good: 70, pass: 50 };
  assert.deepEqual([90, 89.9, 70, 69, 50, 49].map(s => gradeFor(s, m)), ["excellent", "good", "good", "pass", "pass", "fail"]);
});
