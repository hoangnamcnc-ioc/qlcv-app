import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { nowStr } from "../helpers";

// Đăng nhập/đăng xuất, khôi phục phiên, và đổi mật khẩu.
// Tách khỏi App.jsx vì đây là domain độc lập (không phụ thuộc nhiệm vụ/nhân viên/...).
export default function useAuth({ showToast, onLogout }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const logLogin = async (username, success, fullName) => { try { await supabase.from("login_history").insert({ id: `lg${Date.now()}${Math.random().toString(36).slice(2, 6)}`, username, full_name: fullName || "", success, at: nowStr() }); } catch { } };

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) { setLoginError("Vui lòng nhập đầy đủ"); return; }
    setLoginLoading(true); setLoginError("");
    // Đăng nhập qua RPC server-side: hash được so sánh trong Postgres, password không bao giờ rời server
    const { data, error } = await supabase.rpc("login", { p_username: loginForm.username, p_password: loginForm.password });
    const user = Array.isArray(data) ? data[0] : data;
    if (error || !user) { setLoginError("Sai tên đăng nhập hoặc mật khẩu"); setLoginLoading(false); logLogin(loginForm.username, false, ""); return; }
    setCurrentUser(user); sessionStorage.setItem("qlcv_user", JSON.stringify(user)); setLoginLoading(false); logLogin(user.username, true, user.full_name);
  };
  const handleLogout = () => { setCurrentUser(null); sessionStorage.removeItem("qlcv_user"); onLogout?.(); };
  useEffect(() => { const s = sessionStorage.getItem("qlcv_user"); if (s) try { setCurrentUser(JSON.parse(s)); } catch { }; }, []);

  // ── Đổi mật khẩu ──
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [changePwdForm, setChangePwdForm] = useState({ current: "", next: "", confirm: "" });
  const [changePwdError, setChangePwdError] = useState("");
  const handleChangePwd = async () => {
    const { current, next, confirm } = changePwdForm;
    if (!current || !next || !confirm) { setChangePwdError("Vui lòng điền đầy đủ cả 3 ô"); return; }
    if (next.length < 6) { setChangePwdError("Mật khẩu mới phải có ít nhất 6 ký tự"); return; }
    if (next !== confirm) { setChangePwdError("Mật khẩu xác nhận không khớp"); return; }
    // Đổi mật khẩu qua RPC: server tự kiểm tra mật khẩu hiện tại, trả về true/false
    const { data: ok, error } = await supabase.rpc("change_password", { p_username: currentUser.username, p_current: current, p_new: next });
    if (error) { showToast("Lỗi khi đổi mật khẩu", "error"); return; }
    if (!ok) { setChangePwdError("Mật khẩu hiện tại không đúng"); return; }
    showToast("Đổi mật khẩu thành công ✓");
    setShowChangePwd(false);
    setChangePwdForm({ current: "", next: "", confirm: "" });
    setChangePwdError("");
  };

  return {
    currentUser, setCurrentUser,
    loginForm, setLoginForm, loginError, loginLoading, handleLogin, handleLogout,
    showChangePwd, setShowChangePwd, changePwdForm, setChangePwdForm, changePwdError, setChangePwdError, handleChangePwd,
  };
}
