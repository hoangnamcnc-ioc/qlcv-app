import { useState } from "react";
import { supabase } from "../supabase";
import { hashPwd } from "../helpers";

// CRUD tài khoản đăng nhập (bảng users) + form quản lý trong modal "🔐 Tài khoản".
export default function useUsers({ users, setUsers, showToast, setSaving }) {
  const [userModal, setUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ username: "", password: "", full_name: "", role: "staff", employee_id: "" });
  const [userEditId, setUserEditId] = useState(null);

  const submitUser = async () => {
    if (!userForm.username || !userForm.full_name) { return; }
    if (!userEditId && !userForm.password) return;
    setSaving(true);
    if (userEditId) {
      const cur = users.find(u => u.id === userEditId);
      const pwd = userForm.password ? await hashPwd(userForm.password) : cur.password;
      const uf = { ...userForm, password: pwd };
      await supabase.from("users").update(uf).eq("id", userEditId);
      setUsers(p => p.map(u => u.id === userEditId ? { ...u, ...uf } : u));
    } else {
      const u = { ...userForm, password: await hashPwd(userForm.password), id: `u${Date.now()}` };
      await supabase.from("users").insert(u);
      setUsers(p => [...p, u]);
    }
    setUserForm({ username: "", password: "", full_name: "", role: "staff", employee_id: "" });
    setUserEditId(null);
    showToast("Đã lưu");
    setSaving(false);
  };
  const deleteUser = async id => { await supabase.from("users").delete().eq("id", id); setUsers(p => p.filter(u => u.id !== id)); };
  const resetUserPwd = async u => { if (!window.confirm(`Đặt lại mật khẩu của "${u.full_name}" về mặc định (abc123)?`)) return; const h = await hashPwd("abc123"); await supabase.from("users").update({ password: h }).eq("id", u.id); setUsers(p => p.map(x => x.id === u.id ? { ...x, password: h } : x)); showToast(`Đã đặt lại mật khẩu của ${u.full_name} → abc123`); };

  return { userModal, setUserModal, userForm, setUserForm, userEditId, setUserEditId, submitUser, deleteUser, resetUserPwd };
}
