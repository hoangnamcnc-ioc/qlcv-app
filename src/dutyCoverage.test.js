import test from "node:test";
import assert from "node:assert/strict";
import { dutyCoverage } from "./dutyCoverage.js";

test("lich con du dai -> khong canh bao", () => {
  assert.deepEqual(dutyCoverage(["2026-10-01", "2026-12-31"], "2026-10-22"), { last: "2026-12-31", daysLeft: 70, warn: false });
});
test("lich sap het (<=10 ngay) -> canh bao", () => {
  const c = dutyCoverage(["2026-10-01", "2026-10-31"], "2026-10-22");
  assert.equal(c.daysLeft, 9); assert.equal(c.warn, true);
  assert.equal(dutyCoverage(["2026-11-01"], "2026-10-22").warn, true);  // dung 10 ngay: van canh bao (<=10)
  assert.equal(dutyCoverage(["2026-11-02"], "2026-10-22").warn, false); // 11 ngay: chua canh bao
});
test("lich da het -> daysLeft am va canh bao", () => {
  const c = dutyCoverage(["2026-10-15"], "2026-10-22"); assert.equal(c.daysLeft, -7); assert.equal(c.warn, true);
});
test("chua co lich nao -> khong canh bao (nguoi dung chua bat dau dung)", () => {
  assert.deepEqual(dutyCoverage([], "2026-10-22"), { last: null, daysLeft: null, warn: false });
  assert.equal(dutyCoverage(["khong phai ngay"], "2026-10-22").last, null);
});
