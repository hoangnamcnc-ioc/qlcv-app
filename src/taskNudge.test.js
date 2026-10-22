import test from "node:test";
import assert from "node:assert/strict";
import { daysLate, isDailyRecurring, needsAttention, isEscalated, myAttentionList, escalatedList } from "./taskNudge.js";

const TODAY = "2026-10-22";
const mk = (o = {}) => ({ id: "t", eid: "e1", dept: "HCTH", deadline: "2026-10-10", completed: false, ...o });

test("daysLate tinh theo ngay lich", () => {
  assert.equal(daysLate("2026-10-19", TODAY), 3);
  assert.equal(daysLate("2026-10-22", TODAY), 0);
  assert.equal(daysLate("2026-10-25", TODAY), -3);
  assert.equal(daysLate("", TODAY), 0);
  assert.equal(daysLate("2026-09-30", "2026-10-01"), 1); // qua thang
});
test("viec dinh ky hang ngay (weight 0.25) bi loai", () => {
  assert.equal(isDailyRecurring({ template_id: "rt1", weight: 0.25 }), true);
  assert.equal(isDailyRecurring({ template_id: "rt1", weight: 1 }), false);
  assert.equal(isDailyRecurring({ weight: 0.25 }), false);
});
test("needsAttention: tre >=3 ngay, chua xong, khong cho duyet", () => {
  assert.equal(needsAttention(mk({ deadline: "2026-10-19" }), TODAY), true);   // tre dung 3 ngay
  assert.equal(needsAttention(mk({ deadline: "2026-10-20" }), TODAY), false);  // tre 2 ngay
  assert.equal(needsAttention(mk({ completed: true }), TODAY), false);
  assert.equal(needsAttention(mk({ completion_requested: true }), TODAY), false);
  assert.equal(needsAttention(mk({ deleted: true }), TODAY), false);
  assert.equal(needsAttention(mk({ pending_create: true }), TODAY), false);
  assert.equal(needsAttention(mk({ template_id: "r", weight: 0.25 }), TODAY), false);
  assert.equal(needsAttention(mk({ template_id: "r", weight: 1 }), TODAY), true); // dinh ky tuan/thang van tinh
});
test("isEscalated: tre >=14 ngay", () => {
  assert.equal(isEscalated(mk({ deadline: "2026-10-08" }), TODAY), true);
  assert.equal(isEscalated(mk({ deadline: "2026-10-09" }), TODAY), false);
});
test("myAttentionList: chi viec cua minh, tre lau nhat truoc", () => {
  const l = myAttentionList([mk({ id: "a", deadline: "2026-10-15" }), mk({ id: "b", deadline: "2026-10-01" }), mk({ id: "c", eid: "e2", deadline: "2026-10-01" })], "e1", TODAY);
  assert.deepEqual(l.map(t => t.id), ["b", "a"]);
});
test("escalatedList: loc theo phong, bo viec cua chinh nguoi xem", () => {
  const ts = [mk({ id: "a", dept: "HCTH", deadline: "2026-09-01" }), mk({ id: "b", dept: "HT-NTS", deadline: "2026-09-01" }), mk({ id: "c", dept: "HCTH", eid: "me", deadline: "2026-09-01" }), mk({ id: "d", dept: "HCTH", deadline: "2026-10-20" })];
  assert.deepEqual(escalatedList(ts, ["HCTH"], "me", TODAY).map(t => t.id), ["a"]);
  assert.deepEqual(escalatedList(ts, [], "me", TODAY).map(t => t.id).sort(), ["a", "b"]);
});
