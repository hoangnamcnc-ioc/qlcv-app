import { useState } from "react";
import { supabase } from "../supabase";

const ROLE_RANK = { "Trưởng phòng": 0, "TP. HCTH": 0, "Phó trưởng phòng": 1, "Phó phòng": 1, "Chuyên viên": 2, "Nhân viên": 3 };

// CRUD nhân viên + form thêm/sửa + sắp xếp danh sách theo phòng ban.
export default function useEmployees({ employees, setEmployees, showToast, setSaving }) {
  const addEmployee = async d => { setSaving(true); const e = { ...d, id: `e${Date.now()}` }; await supabase.from("employees").insert(e); setEmployees(p => [...p, e]); showToast("Đã thêm"); setSaving(false); };
  const updateEmployee = async (id, d) => { setSaving(true); await supabase.from("employees").update(d).eq("id", id); setEmployees(p => p.map(e => e.id === id ? { ...e, ...d } : e)); setSaving(false); };
  const deleteEmployee = async id => { setSaving(true); await supabase.from("employees").delete().eq("id", id); setEmployees(p => p.filter(e => e.id !== id)); setSaving(false); };

  const [empForm, setEmpForm] = useState(null);
  const [empDeptTab, setEmpDeptTab] = useState("HCTH");
  const openCreateEmp = dept => setEmpForm({ data: { name: "", dept: dept || "HCTH", role: "Nhân viên" }, editId: null });
  const openEditEmp = emp => setEmpForm({ data: { name: emp.name, dept: emp.dept, role: emp.role }, editId: emp.id });
  const submitEmp = async () => { const { data, editId } = empForm; if (!data.name.trim()) return; if (editId) await updateEmployee(editId, data); else await addEmployee(data); setEmpForm(null); };

  const deptEmps = dept => (employees || []).filter(e => e.dept === dept).sort((a, b) => { const ra = ROLE_RANK[a.role] ?? 2, rb = ROLE_RANK[b.role] ?? 2; if (ra !== rb) return ra - rb; const fa = (a.name || "").trim().split(" ").pop(); const fb = (b.name || "").trim().split(" ").pop(); const c = fa.localeCompare(fb, "vi"); return c !== 0 ? c : (a.name || "").localeCompare(b.name || "", "vi"); });

  return {
    addEmployee, updateEmployee, deleteEmployee,
    empForm, setEmpForm, empDeptTab, setEmpDeptTab, openCreateEmp, openEditEmp, submitEmp,
    deptEmps,
  };
}
