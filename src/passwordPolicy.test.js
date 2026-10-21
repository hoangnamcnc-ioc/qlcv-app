import test from "node:test";
import assert from "node:assert/strict";
import { isWeakPassword } from "./passwordPolicy.js";

test("mat khau mac dinh/de doan bi coi la yeu", () => {
  for (const p of ["abc123", "ABC123", " abc123 ", "admin123@", "123456", "password"]) assert.equal(isWeakPassword(p, "u"), true, p);
});
test("mat khau trung ten dang nhap bi coi la yeu", () => {
  assert.equal(isWeakPassword("thuyhtp", "thuyhtp"), true);
  assert.equal(isWeakPassword("THUYHTP", "thuyhtp"), true);
});
test("mat khau tot khong bi chan", () => {
  for (const p of ["Xk9#mQ2vLp", "DakLak@IOC2026", "toiyeuDakLak88"]) assert.equal(isWeakPassword(p, "thuyhtp"), false, p);
});
test("rong khong coi la yeu (de bao loi rieng)", () => {
  assert.equal(isWeakPassword("", "u"), false);
  assert.equal(isWeakPassword(null, "u"), false);
});
