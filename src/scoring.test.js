// Kiểm thử công thức điểm (scoring.js). Chạy: npm test  (dùng test runner có sẵn của Node, không cần cài thêm).
// Mục tiêu: KHÓA hành vi công thức để sửa chỗ khác không vô tình làm lệch điểm cá nhân/điều hành/quy đổi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { staffScore, managerScore, sumW } from "./scoring.js";

// Tạo n việc cùng trạng thái/đánh giá/trọng số
const mk = (n, status, rating = "tot", weight = 1) => Array.from({ length: n }, () => ({ status, rating, weight }));

// ── sumW (quy đổi trọng số) ──────────────────────────────────────────────────
test("sumW cộng trọng số & làm tròn 2 chữ số", () => {
  assert.equal(sumW([]), 0);
  assert.equal(sumW(mk(4, "completed", "tot", 0.25)), 1); // 4 việc ngày = 1 việc quy đổi
  assert.equal(sumW([{ weight: 2.5 }, { weight: 0.25 }, {}]), 3.75); // mặc định weight = 1
});

// ── Điểm cá nhân (staffScore) ────────────────────────────────────────────────
test("staff: rỗng → 0 điểm, chưa đủ ĐK, không breakdown", () => {
  const s = staffScore([]);
  assert.equal(s.perfScore, 0);
  assert.equal(s.eligible, false);
  assert.equal(s.breakdown, null);
  assert.equal(s.resolved, 0);
});

test("staff: 5 việc đúng hạn 'Tốt' → 90đ, đủ ĐK", () => {
  const s = staffScore(mk(5, "completed", "tot"));
  assert.equal(s.eligible, true);
  assert.equal(s.breakdown.timeliness, 60);
  assert.equal(s.breakdown.quality, 30);
  assert.equal(s.breakdown.penalty, 0);
  assert.equal(s.breakdown.workloadBonus, 0);
  assert.equal(s.perfScore, 90);
});

test("staff: 10 việc 'Xuất sắc' đúng hạn → 100đ (kịch trần chất lượng)", () => {
  const s = staffScore(mk(10, "completed", "xuat_sac"));
  assert.equal(s.breakdown.quality, 40);
  assert.equal(s.perfScore, 100);
});

test("staff: có trễ & quá hạn → bị phạt 2đ/việc", () => {
  const s = staffScore([...mk(8, "completed", "tot"), ...mk(2, "completed_late"), ...mk(2, "overdue")]);
  assert.equal(s.resolved, 12);
  assert.equal(s.breakdown.timeliness, 45);   // (8*60+2*30)/12
  assert.equal(s.breakdown.quality, 20);      // 8*3 / (12*4) * 40
  assert.equal(s.breakdown.penalty, 8);       // (2+2)*2
  assert.equal(s.perfScore, 57);
});

test("staff: thưởng khối lượng chỉ tính khi >15 việc, tối đa +10", () => {
  const s = staffScore(mk(30, "completed", "tot"));
  assert.equal(s.breakdown.workloadBonus, 10); // min(30-15,10)
  assert.equal(s.perfScore, 100);              // 60+30+10 (giới hạn 100)
  assert.equal(staffScore(mk(15, "completed", "tot")).breakdown.workloadBonus, 0); // đúng mốc 15 chưa thưởng
});

test("staff: <5 việc vẫn ra điểm (tham khảo) nhưng eligible=false", () => {
  const s = staffScore(mk(3, "completed", "tot"));
  assert.equal(s.perfScore, 90);
  assert.equal(s.eligible, false);
});

test("staff: nghiệm thu theo TRỌNG SỐ quy đổi (việc ngày 0.25)", () => {
  const s = staffScore(mk(4, "completed", "tot", 0.25)); // 4 việc ngày = 1 quy đổi
  assert.equal(s.resolved, 1);
  assert.equal(s.eligible, false);
  assert.equal(s.breakdown.timeliness, 60);
  assert.equal(s.breakdown.quality, 30); // (4*3*0.25)/(1*4)*40
  assert.equal(s.perfScore, 90);
});

test("staff: việc chưa đánh giá tính chất lượng = Trung bình (2/4)", () => {
  const s = staffScore(mk(5, "completed", "")); // rating rỗng (chưa nghiệm thu) → mặc định 2
  assert.equal(s.breakdown.quality, 20); // (5*2)/(5*4)*40
});

test("staff: thưởng ưu tiên — việc Cao đúng hạn +0.5đ/việc, tối đa +5", () => {
  const high = n => Array.from({ length: n }, () => ({ status: "completed", rating: "tot", weight: 1, prio: "high" }));
  const s5 = staffScore(high(5)); // 5 việc Cao đúng hạn → +2.5
  assert.equal(s5.breakdown.prioBonus, 2.5);
  assert.equal(s5.perfScore, 93); // 90 (5 tot) + 2.5, làm tròn 92.5 → 93
  const s20 = staffScore(high(20)); // 20 việc Cao → bonus min(10,5)=5 (kịch trần)
  assert.equal(s20.breakdown.prioBonus, 5);
  const noPrio = staffScore(mk(5, "completed", "tot")); // không đánh dấu ưu tiên → không thưởng
  assert.equal(noPrio.breakdown.prioBonus, 0);
});

// ── Điểm điều hành (managerScore) ────────────────────────────────────────────
test("manager: rỗng → 0, chưa đủ ĐK", () => {
  const m = managerScore([], 6);
  assert.equal(m.perfScore, 0);
  assert.equal(m.eligible, false);
  assert.equal(m.resolvedW, 0);
});

test("manager: phòng 6 người, 16 đúng hạn + 2 trễ + 2 quá hạn → 74đ", () => {
  const m = managerScore([...mk(16, "completed", "tot"), ...mk(2, "completed_late"), ...mk(2, "overdue")], 6);
  assert.equal(m.resolvedW, 20);
  assert.equal(m.onTimeRate, 80);
  assert.equal(m.breakdown.timeliness, 51); // (16*60+2*30)/20
  assert.equal(m.breakdown.quality, 24);
  assert.equal(m.breakdown.penalty, 1);     // 2/20*10
  assert.equal(m.breakdown.mgmtBonus, 0);   // perHead 3.33 < 10
  assert.equal(m.perfScore, 74);
});

test("manager: thưởng khối lượng theo BÌNH QUÂN ĐẦU NGƯỜI (>10 mới thưởng, ≥20 kịch trần)", () => {
  const full = managerScore(mk(120, "completed", "tot"), 6); // 20/người
  assert.equal(full.perHead, 20);
  assert.equal(full.breakdown.mgmtBonus, 10);
  assert.equal(full.perfScore, 100);
  const half = managerScore(mk(90, "completed", "tot"), 6);   // 15/người
  assert.equal(half.perHead, 15);
  assert.equal(half.breakdown.mgmtBonus, 5);
  assert.equal(half.perfScore, 95);
});

test("manager: CÔNG BẰNG theo quy mô — 45 việc/3 người = 90 việc/6 người (cùng 15/người → +5)", () => {
  const small = managerScore(mk(45, "completed", "tot"), 3);
  const big = managerScore(mk(90, "completed", "tot"), 6);
  assert.equal(small.breakdown.mgmtBonus, 5);
  assert.equal(small.perfScore, big.perfScore);
});

test("manager: empCount thiếu/0 không chia cho 0", () => {
  const m = managerScore(mk(10, "completed", "tot"), 0);
  assert.equal(Number.isFinite(m.perHead), true);
  assert.equal(Number.isFinite(m.perfScore), true);
});
