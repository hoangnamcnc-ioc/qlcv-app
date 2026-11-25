import test from "node:test";
import assert from "node:assert/strict";
import { encryptText, decryptText, isEncryptedBackup } from "./backupCrypto.js";

test("mã hóa rồi giải mã lại đúng nội dung (kể cả tiếng Việt và dữ liệu lớn)", async () => {
  const big = JSON.stringify({ a: "Đắk Lắk — Phòng HCTH ".repeat(50000) });
  const e = await encryptText(big, "mật-khẩu-123");
  const o = JSON.parse(e);
  assert.ok(isEncryptedBackup(o)); assert.ok(!e.includes("Đắk Lắk"));
  assert.equal(await decryptText(o, "mật-khẩu-123"), big);
});
test("sai mật khẩu hoặc tệp bị sửa thì báo lỗi", async () => {
  const o = JSON.parse(await encryptText("{\"x\":1}", "dung"));
  await assert.rejects(() => decryptText(o, "sai"), /Sai mật khẩu mã hóa/);
  const bad = { ...o, data: o.data.slice(0, -4) + "AAAA" };
  await assert.rejects(() => decryptText(bad, "dung"), /Sai mật khẩu mã hóa/);
});
test("hai lần mã hóa cùng nội dung cho kết quả khác nhau (muối/IV ngẫu nhiên)", async () => {
  assert.notEqual(await encryptText("abc", "k"), await encryptText("abc", "k"));
});
