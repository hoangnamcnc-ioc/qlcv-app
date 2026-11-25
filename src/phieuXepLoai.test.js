import test from "node:test";
import assert from "node:assert/strict";
import { buildLeaderTask, buildPhieuBody, isLeaderRole, aggregateCommon } from "./phieuXepLoai.js";

test("phiếu lãnh đạo: tái hiện đúng tổng 58,5 điểm của phiếu Giám đốc mẫu", () => {
  const manual = { I: 9.2, II: 8.2, III: 8.2, IV: { 0: 2.2, 1: 2.3, 2: 1.5, 3: 2.5 }, V: { 0: 3, 1: 3.2, 2: 2.8, 3: 3.2 }, VI: { 0: 3.5, 1: 3.2, 2: 3.2, 3: 2.3 } };
  const t = buildLeaderTask([], manual);
  assert.equal(t.secs.length, 6);
  assert.equal(Math.round(t.total * 10) / 10, 58.5);
  assert.equal(t.max, 70);
  assert.deepEqual(t.secs.map(s => s.max), [10, 10, 10, 10, 15, 15]);
});
test("phiếu lãnh đạo: mục I–III tự tính khi có số liệu, mỗi mục tối đa 10", () => {
  const pm = [{ month1: 9, resolved: 10, done: 10, onTime: 10, completedLate: 0, over: 0, breakdown: { qty: 100, progress: 100, quality: 90 } }];
  const t = buildLeaderTask(pm, {});
  assert.deepEqual(t.secs.slice(0, 3).map(s => Math.round(s.pts * 10) / 10), [10, 9, 10]);
});
test("nhận diện chức danh lãnh đạo và dựng được HTML phiếu", () => {
  assert.ok(isLeaderRole("Giám đốc") && isLeaderRole("Trưởng phòng") && !isLeaderRole("Chuyên viên"));
  const html = buildPhieuBody({ year: 2026, name: "A", role: "Giám đốc", dept: "", mins: { excellent: 90, good: 70, pass: 50 }, common: { self: aggregateCommon([], "x", 2026, "self"), official: null }, task: buildLeaderTask([], {}), notes: { pros: [], cons: [], fix: [] } });
  assert.ok(html.includes("Về năng lực tập hợp, đoàn kết") && html.includes("Tổng cộng Mục 2"));
});
