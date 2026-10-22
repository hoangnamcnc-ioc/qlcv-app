import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { nowStr } from "../helpers";

import { isWeakPassword } from "../passwordPolicy";
const MUST_KEY = "qlcv_must_change_pwd";

// Đăng nhập/đăng xuất, khôi phục phiên, và đổi mật khẩu.
// Tách khỏi App.jsx vì đây là domain độc lập (không phụ thuộc nhiệm vụ/nhân viên/...).
export default function useAuth({ showToast, onLogout }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [mustChangePwd, setMustChangePwd] = useState(() => { try { return sessionStorage.getItem(MUST_KEY) === "1"; } catch { return false; } });

  // ── Email nhận nhắc việc: hỏi lúc đăng nhập nếu chưa có; sửa/tắt được bất cứ lúc nào qua nút ✉️ ──
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const [emailPrompt, setEmailPrompt] = useState(null); // { email, password, error, saving, forced }
  // Kiểm tra email của tài khoản; chưa có → mở hộp nhập. RPC lỗi (chưa chạy SQL 47) → im lặng bỏ qua.
  const checkEmail = async (username, password) => {
    try {
      const { data, error } = await supabase.rpc("get_my_email", { p_user: username, p_pass: password });
      if (!error && (data === null || data === "")) setEmailPrompt({ email: "", password, error: "", saving: false, forced: true });
    } catch { }
  };
  const openEmailModal = async () => {
    setEmailPrompt({ email: "", password: "", error: "", saving: false, forced: false });
  };
  const saveEmail = async () => {
    const p = emailPrompt; if (!p || !currentUser) return;
    const email = (p.email || "").trim();
    if (email && !EMAIL_RE.test(email)) { setEmailPrompt(x => ({ ...x, error: "Email chưa đúng định dạng (ví dụ: ten@coquan.gov.vn)" })); return; }
    if (!email && p.forced) { setEmailPrompt(x => ({ ...x, error: "Vui lòng nhập email, hoặc bấm “Để sau”." })); return; }
    if (!p.password) { setEmailPrompt(x => ({ ...x, error: "Nhập mật khẩu hiện tại để xác nhận" })); return; }
    setEmailPrompt(x => ({ ...x, saving: true, error: "" }));
    const { error } = await supabase.rpc("set_my_email", { p_user: currentUser.username, p_pass: p.password, p_email: email });
    if (error) {
      const m = /mật khẩu/i.test(error.message || "") ? "Mật khẩu không đúng" : /không hợp lệ/i.test(error.message || "") ? "Email không hợp lệ" : "Chưa lưu được (máy chủ chưa bật tính năng email — cần quản trị chạy SQL 47)";
      setEmailPrompt(x => ({ ...x, saving: false, error: m })); return;
    }
    setEmailPrompt(null);
    showToast(email ? "Đã lưu email — bạn sẽ nhận nhắc việc mỗi sáng ✉️" : "Đã tắt email nhắc việc");
  };

  const logLogin = async (username, success, fullName) => { try { await supabase.from("login_history").insert({ id: `lg${Date.now()}${Math.random().toString(36).slice(2, 6)}`, username, full_name: fullName || "", success, at: nowStr() }); } catch { } };

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) { setLoginError("Vui lòng nhập đầy đủ"); return; }
    setLoginLoading(true); setLoginError("");
    // Đăng nhập qua RPC server-side: hash được so sánh trong Postgres, password không bao giờ rời server
    const { data, error } = await supabase.rpc("login", { p_username: loginForm.username, p_password: loginForm.password });
    const user = Array.isArray(data) ? data[0] : data;
    if (error || !user) { setLoginError("Sai tên đăng nhập hoặc mật khẩu"); setLoginLoading(false); logLogin(loginForm.username, false, ""); return; }
    setCurrentUser(user); sessionStorage.setItem("qlcv_user", JSON.stringify(user)); setLoginLoading(false); logLogin(user.username, true, user.full_name);
    // Mật khẩu mặc định/yếu → BẮT BUỘC đổi trước khi dùng app (điền sẵn mật khẩu hiện tại cho tiện)
    if (isWeakPassword(loginForm.password, user.username)) {
      try { sessionStorage.setItem(MUST_KEY, "1"); } catch { }
      setMustChangePwd(true); setChangePwdForm({ current: loginForm.password, next: "", confirm: "" }); setChangePwdError(""); setShowChangePwd(true);
    } else {
      checkEmail(user.username, loginForm.password);
    }
  };
  const handleLogout = () => { setCurrentUser(null); sessionStorage.removeItem("qlcv_user"); try { sessionStorage.removeItem(MUST_KEY); } catch { } setMustChangePwd(false); setShowChangePwd(false); setEmailPrompt(null); onLogout?.(); };
  // Khôi phục phiên (F5): nếu còn cờ bắt buộc đổi mật khẩu thì mở lại hộp đổi mật khẩu
  useEffect(() => { const s = sessionStorage.getItem("qlcv_user"); if (s) try { setCurrentUser(JSON.parse(s)); if (sessionStorage.getItem(MUST_KEY) === "1") setShowChangePwd(true); } catch { }; }, []);

  // ── Đổi mật khẩu ──
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [changePwdForm, setChangePwdForm] = useState({ current: "", next: "", confirm: "" });
  const [changePwdError, setChangePwdError] = useState("");
  const handleChangePwd = async () => {
    const { current, next, confirm } = changePwdForm;
    if (!current || !next || !confirm) { setChangePwdError("Vui lòng điền đầy đủ cả 3 ô"); return; }
    if (next.length < 8) { setChangePwdError("Mật khẩu mới phải có ít nhất 8 ký tự"); return; }
    if (isWeakPassword(next, currentUser.username)) { setChangePwdError("Mật khẩu mới quá dễ đoán (mật khẩu mặc định hoặc trùng tên đăng nhập) — hãy chọn mật khẩu khác"); return; }
    if (next === current) { setChangePwdError("Mật khẩu mới phải khác mật khẩu hiện tại"); return; }
    if (next !== confirm) { setChangePwdError("Mật khẩu xác nhận không khớp"); return; }
    // Đổi mật khẩu qua RPC: server tự kiểm tra mật khẩu hiện tại, trả về true/false
    const { data: ok, error } = await supabase.rpc("change_password", { p_username: currentUser.username, p_current: current, p_new: next });
    if (error) { showToast("Lỗi khi đổi mật khẩu", "error"); return; }
    if (!ok) { setChangePwdError("Mật khẩu hiện tại không đúng"); return; }
    showToast("Đổi mật khẩu thành công ✓");
    const wasForced = mustChangePwd;
    try { sessionStorage.removeItem(MUST_KEY); } catch { } setMustChangePwd(false);
    setShowChangePwd(false);
    if (wasForced) checkEmail(currentUser.username, next);
    setChangePwdForm({ current: "", next: "", confirm: "" });
    setChangePwdError("");
  };

  return {
    currentUser, setCurrentUser, mustChangePwd, emailPrompt, setEmailPrompt, saveEmail, openEmailModal,
    loginForm, setLoginForm, loginError, loginLoading, handleLogin, handleLogout,
    showChangePwd, setShowChangePwd, changePwdForm, setChangePwdForm, changePwdError, setChangePwdError, handleChangePwd,
  };
}
