import { useState, useRef } from "react";
import { supabase } from "../supabase";

// CRUD tài khoản đăng nhập (bảng users). BẢO MẬT (bước 1b): anon KHÔNG còn ghi trực tiếp bảng users
// (revoke insert/update/delete) để chống tạo admin giả / đổi mật khẩu người khác. Mọi thao tác đi qua
// RPC SECURITY DEFINER, yêu cầu XÁC THỰC LẠI mật khẩu quản trị của chính admin đang đăng nhập.
export default function useUsers({ users, setUsers, showToast, setSaving, currentUser }) {
  const [userModal, setUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ username: "", password: "", full_name: "", role: "staff", employee_id: "" });
  const [userEditId, setUserEditId] = useState(null);
  const adminPassRef = useRef(""); // giữ trong bộ nhớ phiên làm việc, KHÔNG lưu ra localStorage

  const getAdminPass = () => {
    if (adminPassRef.current) return adminPassRef.current;
    const p = window.prompt("Nhập MẬT KHẨU quản trị của bạn để xác nhận thao tác tài khoản:", "");
    if (p) adminPassRef.current = p;
    return p || "";
  };
  const callAdmin = async (fn, args) => {
    const pass = getAdminPass();
    if (!pass) return { error: { message: "Đã hủy — cần mật khẩu quản trị" } };
    const { data, error } = await supabase.rpc(fn, { p_admin_user: currentUser?.username, p_admin_pass: pass, ...args });
    if (error && /mật khẩu|quyền|permission|admin/i.test(error.message || "")) adminPassRef.current = ""; // sai pass → lần sau hỏi lại
    return { data, error };
  };
  const refreshUsers = async () => { const { data } = await supabase.from("users").select("id,username,full_name,role,employee_id"); if (data) setUsers(data); };

  const submitUser = async () => {
    if (!userForm.username || !userForm.full_name) return;
    if (!userEditId && !userForm.password) return;
    setSaving(true);
    const { error } = await callAdmin("admin_upsert_user", {
      p_id: userEditId || null,
      p_username: userForm.username.trim(),
      p_password: userForm.password || "",
      p_full_name: userForm.full_name.trim(),
      p_role: userForm.role,
      p_employee_id: userForm.employee_id || "",
    });
    setSaving(false);
    if (error) { showToast("Lỗi lưu tài khoản: " + (error.message || ""), "error"); return; }
    await refreshUsers();
    setUserForm({ username: "", password: "", full_name: "", role: "staff", employee_id: "" });
    setUserEditId(null);
    showToast("Đã lưu tài khoản");
  };
  const deleteUser = async id => {
    if (!window.confirm("Xóa tài khoản này?")) return;
    const { error } = await callAdmin("admin_delete_user", { p_id: id });
    if (error) { showToast("Lỗi xóa: " + (error.message || ""), "error"); return; }
    setUsers(p => p.filter(u => u.id !== id));
    showToast("Đã xóa tài khoản");
  };
  const resetUserPwd = async u => {
    if (!window.confirm(`Đặt lại mật khẩu của "${u.full_name}" về mặc định (abc123)?`)) return;
    const { error } = await callAdmin("admin_reset_password", { p_id: u.id });
    if (error) { showToast("Lỗi đặt lại mật khẩu: " + (error.message || ""), "error"); return; }
    showToast(`Đã đặt lại mật khẩu của ${u.full_name} → abc123`);
  };

  return { userModal, setUserModal, userForm, setUserForm, userEditId, setUserEditId, submitUser, deleteUser, resetUserPwd };
}
