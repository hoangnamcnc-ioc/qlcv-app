import test from "node:test";
import assert from "node:assert/strict";
import { leaderTodos, isLeaderUser } from "./leaderTodos.js";

const emps = [
  { id: "e1", dept: "HCTH", name: "TP" }, { id: "e2", dept: "HCTH", name: "A" }, { id: "e3", dept: "HCTH", name: "B" }, { id: "e4", dept: "HT-NTS", name: "C" },
  { id: "e5", dept: "HCTH", name: "Nghỉ", left_at: "2026-09-30" },
];
const base = { employees: emps, kpiCommon: [], monthlyScores: [], now: new Date(2026, 10, 5), counts: {}, me: emps[0] };

test("nhân viên thường không có danh sách nhắc lãnh đạo", () => {
  assert.deepEqual(leaderTodos({ ...base, role: "staff" }), []);
  assert.ok(isLeaderUser("manager") && isLeaderUser("director") && !isLeaderUser("staff"));
});
test("Trưởng phòng: đếm việc chờ duyệt, quá hạn và nhân viên cùng phòng chưa chấm (không tính người đã nghỉ trước tháng)", () => {
  const t = leaderTodos({ ...base, role: "manager", counts: { approve: 3, overdue: 2 } });
  const k = Object.fromEntries(t.map(x => [x.key, x.count]));
  assert.equal(k.approve, 3); assert.equal(k.overdue, 2);
  assert.equal(k.dept, 2); // e2, e3 (e5 nghỉ 30/9, trước tháng 10 → loại; e4 khác phòng)
  assert.equal(k.self, 1);
  assert.equal(k.center, undefined); assert.equal(k.seal, undefined);
});
test("đã chấm đủ thì không còn nhắc; chốt sổ & đề xuất chỉ cho Giám đốc/Admin", () => {
  const rows = ["e1", "e2", "e3"].map(eid => ({ eid, year: 2026, month: 10, self: JSON.stringify({ a: 5 }), dept: JSON.stringify({ a: 5 }) }));
  const t = leaderTodos({ ...base, role: "manager", kpiCommon: rows });
  assert.ok(!t.some(x => x.key === "dept" || x.key === "self"));
  const d = leaderTodos({ ...base, role: "director", proposals: 2 });
  const k = Object.fromEntries(d.map(x => [x.key, x.count]));
  assert.equal(k.seal, 1); assert.equal(k.proposals, 2); assert.ok(k.center >= 3);
  const sealed = leaderTodos({ ...base, role: "director", monthlyScores: [{ year: 2026, month: 10 }] });
  assert.ok(!sealed.some(x => x.key === "seal"));
});
test("tháng 1: tháng trước là tháng 12 năm trước", () => {
  const t = leaderTodos({ ...base, role: "director", now: new Date(2027, 0, 8) });
  assert.ok(t.find(x => x.key === "seal").text.includes("T12/2026"));
});
