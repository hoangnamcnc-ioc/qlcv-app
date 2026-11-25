// Mã hóa/giải mã tệp sao lưu bằng mật khẩu riêng (AES-256-GCM, khóa dẫn xuất PBKDF2-SHA256) — chạy ngay trên trình duyệt,
// mật khẩu mã hóa KHÔNG gửi đi đâu. Tệp sao lưu chứa mật khẩu đã băm + hồ sơ nhân sự nên nên mã hóa trước khi cất giữ.
const ITER = 250000;
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const key = async (pass, salt, iter) => {
  const base = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
};
export const isEncryptedBackup = o => !!o && o.format === "qlcv-backup-encrypted";

export async function encryptText(plain, pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(pass, salt, ITER), enc.encode(plain)));
  return JSON.stringify({ format: "qlcv-backup-encrypted", v: 1, kdf: "PBKDF2-SHA256", iter: ITER, salt: b64(salt), iv: b64(iv), data: b64(ct) });
}
// Trả về chuỗi gốc; ném lỗi "Sai mật khẩu mã hóa hoặc tệp bị hỏng" nếu không giải mã được
export async function decryptText(obj, pass) {
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(obj.iv) }, await key(pass, unb64(obj.salt), obj.iter || ITER), unb64(obj.data));
    return dec.decode(pt);
  } catch { throw new Error("Sai mật khẩu mã hóa hoặc tệp bị hỏng"); }
}
