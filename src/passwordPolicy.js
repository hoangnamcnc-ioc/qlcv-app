// Chính sách mật khẩu (module thuần, có test): mật khẩu mặc định/quá dễ đoán phải bị BẮT BUỘC đổi.
// "abc123" là mật khẩu admin đặt lại mặc định; "admin123@" từng nằm trong lịch sử repo công khai.
export const WEAK_PASSWORDS = new Set(["abc123", "admin123@", "admin123", "123456", "1234567", "12345678", "123456789", "111111", "000000", "password", "qwerty", "matkhau", "matkhau123"]);
export const isWeakPassword = (pw, username) => {
  const p = (pw || "").trim().toLowerCase();
  if (!p) return false;
  return WEAK_PASSWORDS.has(p) || p === (username || "").trim().toLowerCase();
};
