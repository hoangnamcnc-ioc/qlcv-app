import test from "node:test";
import assert from "node:assert/strict";
import { isActive, wasActiveIn, isAssignable, isRankable } from "./constants.js";

const working = { id: "a", name: "A", role: "Nhân viên" };
const left = { id: "b", name: "B", role: "Nhân viên", left_at: "2026-10-15" };

test("isActive: chi nguoi chua co ngay nghi", () => {
  assert.equal(isActive(working), true);
  assert.equal(isActive(left), false);
  assert.equal(isActive(null), false);
});
test("nguoi da nghi khong con nam trong danh sach giao viec", () => {
  assert.equal(isAssignable(working), true);
  assert.equal(isAssignable(left), false);
});
test("nguoi da nghi VAN la doi tuong xep hang (de giu lich su)", () => {
  assert.equal(isRankable(left), true);
});
test("wasActiveIn: tinh theo thang — con lam o dau thang thi van tinh", () => {
  assert.equal(wasActiveIn(left, 2026, 9), true);    // nghi 15/10: thang 9 con lam
  assert.equal(wasActiveIn(left, 2026, 10), true);   // thang 10: con lam o dau thang (nghi giua thang) -> van tinh thang 10
  assert.equal(wasActiveIn(left, 2026, 11), false);  // tu thang 11 tro di: khong con
  assert.equal(wasActiveIn(left, 2027, 1), false);
  assert.equal(wasActiveIn(working, 2030, 1), true);
  assert.equal(wasActiveIn(null, 2026, 1), false);
});
test("nghi dung ngay 1: thang do khong con tinh", () => {
  assert.equal(wasActiveIn({ left_at: "2026-11-01" }, 2026, 11), true);  // left_at >= dau thang -> con tinh (ngay nghi la ngay 1)
  assert.equal(wasActiveIn({ left_at: "2026-10-31" }, 2026, 11), false);
});
