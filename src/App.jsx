import { useState, useEffect, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "./supabase";

const DEPTS = ["HCTH", "QL-KTDL", "HT-NTS"];
const DEPT_COLOR = { "HCTH": "#6366f1", "QL-KTDL": "#0ea5e9", "HT-NTS": "#10b981" };
const ROLES = ["Trưởng phòng", "Phó phòng", "Chuyên viên", "Nhân viên"];

const DEFAULT_EMPLOYEES = [
  { id:"e1",  name:"Nguyễn Thị Hoa",   dept:"HCTH",    role:"Trưởng phòng" },
  { id:"e2",  name:"Trần Văn An",       dept:"HCTH",    role:"Chuyên viên" },
  { id:"e3",  name:"Lê Thị Mai",        dept:"HCTH",    role:"Chuyên viên" },
  { id:"e4",  name:"Phạm Văn Bình",     dept:"HCTH",    role:"Chuyên viên" },
  { id:"e5",  name:"Hoàng Thị Lan",     dept:"HCTH",    role:"Chuyên viên" },
  { id:"e6",  name:"Đỗ Văn Cường",      dept:"HCTH",    role:"Nhân viên" },
  { id:"e7",  name:"Vũ Thị Thu",        dept:"HCTH",    role:"Nhân viên" },
  { id:"e8",  name:"Ngô Văn Đức",       dept:"HCTH",    role:"Nhân viên" },
  { id:"e9",  name:"Bùi Thị Hạnh",      dept:"HCTH",    role:"Nhân viên" },
  { id:"e10", name:"Đinh Văn Hùng",     dept:"HCTH",    role:"Nhân viên" },
  { id:"e11", name:"Lý Thị Hương",      dept:"HCTH",    role:"Nhân viên" },
  { id:"e12", name:"Trịnh Văn Khoa",    dept:"HCTH",    role:"Nhân viên" },
  { id:"e13", name:"Phan Thị Linh",     dept:"HCTH",    role:"Nhân viên" },
  { id:"e14", name:"Nguyễn Văn Minh",   dept:"QL-KTDL", role:"Trưởng phòng" },
  { id:"e15", name:"Trần Thị Nga",      dept:"QL-KTDL", role:"Phó phòng" },
  { id:"e16", name:"Lê Văn Nam",        dept:"QL-KTDL", role:"Chuyên viên" },
  { id:"e17", name:"Phạm Thị Oanh",     dept:"QL-KTDL", role:"Chuyên viên" },
  { id:"e18", name:"Hoàng Văn Phong",   dept:"QL-KTDL", role:"Chuyên viên" },
  { id:"e19", name:"Đỗ Thị Quỳnh",      dept:"QL-KTDL", role:"Chuyên viên" },
  { id:"e20", name:"Vũ Văn Sơn",        dept:"QL-KTDL", role:"Chuyên viên" },
  { id:"e21", name:"Ngô Thị Tâm",       dept:"QL-KTDL", role:"Nhân viên" },
  { id:"e22", name:"Bùi Văn Thắng",     dept:"QL-KTDL", role:"Nhân viên" },
  { id:"e23", name:"Đinh Thị Thủy",     dept:"QL-KTDL", role:"Nhân viên" },
  { id:"e24", name:"Lý Văn Tiến",       dept:"QL-KTDL", role:"Nhân viên" },
  { id:"e25", name:"Trịnh Thị Trang",   dept:"QL-KTDL", role:"Nhân viên" },
  { id:"e26", name:"Phan Văn Trung",    dept:"QL-KTDL", role:"Nhân viên" },
  { id:"e27", name:"Cao Thị Tuyết",     dept:"QL-KTDL", role:"Nhân viên" },
  { id:"e28", name:"Nguyễn Thị Út",     dept:"HT-NTS",  role:"Trưởng phòng" },
  { id:"e29", name:"Trần Văn Việt",     dept:"HT-NTS",  role:"Phó phòng" },
  { id:"e30", name:"Lê Thị Xuân",       dept:"HT-NTS",  role:"Chuyên viên" },
  { id:"e31", name:"Phạm Văn Yên",      dept:"HT-NTS",  role:"Chuyên viên" },
  { id:"e32", name:"Hoàng Thị Yến",     dept:"HT-NTS",  role:"Chuyên viên" },
  { id:"e33", name:"Đỗ Văn Dũng",       dept:"HT-NTS",  role:"Chuyên viên" },
  { id:"e34", name:"Vũ Thị Diệu",       dept:"HT-NTS",  role:"Chuyên viên" },
  { id:"e35", name:"Ngô Văn Hiếu",      dept:"HT-NTS",  role:"Nhân viên" },
  { id:"e36", name:"Bùi Thị Hiền",      dept:"HT-NTS",  role:"Nhân viên" },
  { id:"e37", name:"Đinh Văn Lộc",      dept:"HT-NTS",  role:"Nhân viên" },
  { id:"e38", name:"Lý Thị Lụa",        dept:"HT-NTS",  role:"Nhân viên" },
  { id:"e39", name:"Trịnh Văn Mạnh",    dept:"HT-NTS",  role:"Nhân viên" },
  { id:"e40", name:"Phan Thị Nhung",    dept:"HT-NTS",  role:"Nhân viên" },
];

const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().split("T")[0]; };
const today = new Date(); today.setHours(0, 0, 0, 0);
const todayStr = today.toISOString().split("T")[0];

const getStatus = t => {
  if (t.completed) return "completed";
  const dl = new Date(t.deadline); dl.setHours(0, 0, 0, 0);
  const diff = Math.ceil((dl - today) / 86400000);
  if (diff < 0) return "overdue";
  if (diff <= 3) return "nearly_due";
  return "on_time";
};

const STATUS = {
  on_time:    { label: "Trong hạn",    bg: "#dcfce7", col: "#15803d", dot: "#16a34a" },
  nearly_due: { label: "Sắp hết hạn", bg: "#fef9c3", col: "#a16207", dot: "#ca8a04" },
  overdue:    { label: "Quá hạn",      bg: "#fee2e2", col: "#b91c1c", dot: "#dc2626" },
  completed:  { label: "Hoàn thành",   bg: "#e0e7ff", col: "#4338ca", dot: "#6366f1" },
};
const PRIO = {
  high:   { label: "Cao",        bg: "#fee2e2", col: "#b91c1c" },
  medium: { label: "Trung bình", bg: "#fef9c3", col: "#92400e" },
  low:    { label: "Thấp",       bg: "#f1f5f9", col: "#475569" },
};

const parseAttachments = (val) => {
  try { return JSON.parse(val || "[]"); } catch { return []; }
};

const getFileIcon = (name) => {
  const ext = name.split(".").pop().toLowerCase();
  if (["jpg","jpeg","png","gif","webp"].includes(ext)) return "🖼️";
  if (["pdf"].includes(ext)) return "📄";
  if (["doc","docx"].includes(ext)) return "📝";
  if (["xls","xlsx"].includes(ext)) return "📊";
  if (["zip","rar"].includes(ext)) return "🗜️";
  return "📎";
};

const emptyTask = (emps) => {
  const first = emps[0];
  return { title: "", description: "", dept: first?.dept || "HCTH", eid: first?.id || "", prio: "medium", deadline: addDays(today, 7), attachments: "[]" };
};
const emptyEmp = (dept) => ({ name: "", dept: dept || "HCTH", role: "Nhân viên" });

export default function App() {
  const [view, setView]           = useState("dashboard");
  const [tasks, setTasks]         = useState(null);
  const [employees, setEmployees] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [modal, setModal]         = useState(null);
  const [taskForm, setTaskForm]   = useState(null);
  const [empForm, setEmpForm]     = useState(null);
  const [empDeptTab, setEmpDeptTab] = useState("HCTH");
  const [fStatus, setFStatus]     = useState("all");
  const [fDept, setFDept]         = useState("all");
  const [fEid, setFEid]           = useState("all");
  const [search, setSearch]       = useState("");
  const [exModal, setExModal]     = useState(false);
  const [exStatus, setExStatus]   = useState("all");
  const [exDept, setExDept]       = useState("all");
  const [toast, setToast]         = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: empData, error: empErr }, { data: taskData, error: taskErr }] =
          await Promise.all([
            supabase.from("employees").select("*").order("dept"),
            supabase.from("tasks").select("*").order("created", { ascending: false }),
          ]);
        if (empErr || taskErr) throw new Error("Lỗi kết nối database");
        if (!empData || empData.length === 0) {
          await supabase.from("employees").insert(DEFAULT_EMPLOYEES);
          setEmployees(DEFAULT_EMPLOYEES);
        } else {
          setEmployees(empData);
        }
        setTasks(taskData || []);
      } catch (e) {
        showToast("Không thể kết nối database. Kiểm tra lại .env", "error");
        setEmployees(DEFAULT_EMPLOYEES);
        setTasks([]);
      }
      setLoading(false);
    })();
  }, []);

  // ── File upload ──
  const uploadFiles = async (files, existingAttachments = []) => {
    setUploadingFiles(true);
    const results = [...existingAttachments];
    for (const file of files) {
      const fileName = `${Date.now()}_${file.name.replace(/\s/g, "_")}`;
      const { error } = await supabase.storage.from("attachments").upload(fileName, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from("attachments").getPublicUrl(fileName);
        results.push({ name: file.name, url: publicUrl });
      } else {
        showToast(`Lỗi upload: ${file.name}`, "error");
      }
    }
    setUploadingFiles(false);
    return results;
  };

  const removeAttachment = async (taskFormData, index) => {
    const atts = parseAttachments(taskFormData.attachments);
    atts.splice(index, 1);
    setTaskForm(f => ({ ...f, data: { ...f.data, attachments: JSON.stringify(atts) } }));
  };

  // ── Task operations ──
  const addTask = async (data) => {
    setSaving(true);
    const t = { ...data, id: `t${Date.now()}`, completed: false, created: todayStr };
    const { error } = await supabase.from("tasks").insert(t);
    if (!error) { setTasks(prev => [t, ...prev]); showToast("Đã tạo nhiệm vụ"); }
    else showToast("Lỗi khi tạo nhiệm vụ", "error");
    setSaving(false);
  };

  const updateTask = async (id, updates) => {
    setSaving(true);
    const { error } = await supabase.from("tasks").update(updates).eq("id", id);
    if (!error) { setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t)); showToast("Đã cập nhật"); }
    else showToast("Lỗi khi cập nhật", "error");
    setSaving(false);
  };

  const deleteTaskFn = async (id) => {
    setSaving(true);
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (!error) { setTasks(prev => prev.filter(t => t.id !== id)); setModal(null); showToast("Đã xóa nhiệm vụ"); }
    else showToast("Lỗi khi xóa", "error");
    setSaving(false);
  };

  const toggleDone = (t) => updateTask(t.id, { completed: !t.completed });

  // ── Employee operations ──
  const addEmployee = async (data) => {
    setSaving(true);
    const e = { ...data, id: `e${Date.now()}` };
    const { error } = await supabase.from("employees").insert(e);
    if (!error) { setEmployees(prev => [...prev, e]); showToast("Đã thêm nhân viên"); }
    else showToast("Lỗi khi thêm nhân viên", "error");
    setSaving(false);
  };

  const updateEmployee = async (id, data) => {
    setSaving(true);
    const { error } = await supabase.from("employees").update(data).eq("id", id);
    if (!error) { setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...data } : e)); showToast("Đã cập nhật"); }
    else showToast("Lỗi khi cập nhật", "error");
    setSaving(false);
  };

  const deleteEmployee = async (id) => {
    setSaving(true);
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (!error) setEmployees(prev => prev.filter(e => e.id !== id));
    setSaving(false);
  };

  // ── Computed ──
  const computed = useMemo(() => (tasks || []).map(t => ({ ...t, status: getStatus(t) })), [tasks]);
  const stats = useMemo(() => computed.reduce((a, t) => ({ ...a, total: a.total + 1, [t.status]: a[t.status] + 1 }),
    { total: 0, on_time: 0, nearly_due: 0, overdue: 0, completed: 0 }), [computed]);
  const deptChart = useMemo(() => DEPTS.map(d => {
    const dt = computed.filter(t => t.dept === d);
    return { name: d, "Trong hạn": dt.filter(t => t.status === "on_time").length, "Sắp hết hạn": dt.filter(t => t.status === "nearly_due").length, "Quá hạn": dt.filter(t => t.status === "overdue").length, "Hoàn thành": dt.filter(t => t.status === "completed").length };
  }), [computed]);
  const filtered = useMemo(() => computed.filter(t => {
    if (fStatus !== "all" && t.status !== fStatus) return false;
    if (fDept !== "all" && t.dept !== fDept) return false;
    if (fEid !== "all" && t.eid !== fEid) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [computed, fStatus, fDept, fEid, search]);

  const getEmp = id => (employees || []).find(e => e.id === id);
  const deptEmps = dept => (employees || []).filter(e => e.dept === dept);

  // ── Task form ──
  const openCreateTask = () => setTaskForm({ data: emptyTask(employees || []), editId: null });
  const openEditTask = t => setTaskForm({ data: { title: t.title, description: t.description || "", dept: t.dept, eid: t.eid, prio: t.prio, deadline: t.deadline, attachments: t.attachments || "[]" }, editId: t.id });
  const changeTaskDept = v => {
    const first = (employees || []).find(e => e.dept === v);
    setTaskForm(f => ({ ...f, data: { ...f.data, dept: v, eid: first ? first.id : "" } }));
  };
  const submitTask = async () => {
    const { data, editId } = taskForm;
    if (!data.title || !data.deadline) return;
    if (editId) await updateTask(editId, data);
    else await addTask(data);
    setTaskForm(null);
  };

  // ── Employee form ──
  const openCreateEmp = dept => setEmpForm({ data: emptyEmp(dept), editId: null });
  const openEditEmp = emp => setEmpForm({ data: { name: emp.name, dept: emp.dept, role: emp.role }, editId: emp.id });
  const submitEmp = async () => {
    const { data, editId } = empForm;
    if (!data.name.trim()) return;
    if (editId) await updateEmployee(editId, data);
    else await addEmployee(data);
    setEmpForm(null);
  };

  // ── Export CSV ──
  const exportCSV = () => {
    const rows = computed.filter(t => (exStatus === "all" || t.status === exStatus) && (exDept === "all" || t.dept === exDept));
    const header = ["Tiêu đề", "Mô tả", "Phòng ban", "Nhân viên", "Chức vụ", "Ưu tiên", "Hạn chót", "Trạng thái", "Ngày tạo", "File đính kèm"];
    const lines = rows.map(t => {
      const emp = getEmp(t.eid);
      const atts = parseAttachments(t.attachments).map(a => a.name).join("; ");
      return [`"${(t.title||"").replace(/"/g,'""')}"`, `"${(t.description||"").replace(/"/g,'""')}"`, t.dept, `"${emp?.name||""}"`, emp?.role||"", PRIO[t.prio]?.label||t.prio, t.deadline, STATUS[t.status]?.label||t.status, t.created||"", `"${atts}"`].join(",");
    });
    const csv = "\uFEFF" + [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `bao-cao-${todayStr}.csv`; a.click();
    URL.revokeObjectURL(url); setExModal(false);
  };

  const inp = { padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, background: "#fff", color: "#111", width: "100%", boxSizing: "border-box" };
  const Chip = ({ s }) => (
    <span style={{ background: STATUS[s].bg, color: STATUS[s].col, fontSize: 12, padding: "2px 8px", borderRadius: 12, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS[s].dot, flexShrink: 0 }} />{STATUS[s].label}
    </span>
  );
  const PChip = ({ p }) => <span style={{ background: PRIO[p].bg, color: PRIO[p].col, fontSize: 12, padding: "2px 8px", borderRadius: 12 }}>{PRIO[p].label}</span>;

  const navItems = [
    { id: "dashboard", label: "📊 Tổng quan" },
    { id: "tasks",     label: "📋 Danh sách nhiệm vụ" },
    { id: "employees", label: "👥 Nhân viên" },
  ];

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif", color: "#6b7280" }}>Đang tải dữ liệu…</div>;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, sans-serif", background: "#f8fafc", overflow: "hidden" }}>

      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 100, background: toast.type === "error" ? "#fee2e2" : "#dcfce7", color: toast.type === "error" ? "#b91c1c" : "#15803d", padding: "10px 18px", borderRadius: 8, fontSize: 13, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
          {toast.msg}
        </div>
      )}

      {/* Sidebar */}
      <div style={{ width: 210, background: "#1e1b4b", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "16px 14px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>🗂️ Quản lý</div>
          <div style={{ color: "#a5b4fc", fontSize: 12, marginTop: 2 }}>Công việc nội bộ</div>
        </div>
        <nav style={{ flex: 1, padding: "8px 0" }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setView(n.id)} style={{ width: "100%", display: "flex", alignItems: "center", padding: "10px 14px", background: view === n.id ? "rgba(165,180,252,0.15)" : "transparent", border: "none", cursor: "pointer", color: view === n.id ? "#c7d2fe" : "#94a3b8", textAlign: "left", fontSize: 13 }}>
              {n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <button onClick={() => setExModal(true)} style={{ width: "100%", background: "rgba(99,102,241,0.25)", border: "none", borderRadius: 7, padding: "8px 10px", cursor: "pointer", color: "#c7d2fe", fontSize: 13, textAlign: "left" }}>
            📤 Xuất báo cáo
          </button>
          {saving && <div style={{ color: "#64748b", fontSize: 11, marginTop: 6, textAlign: "center" }}>Đang lưu…</div>}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>{navItems.find(n => n.id === view)?.label}</span>
          <div style={{ display: "flex", gap: 8 }}>
            {view === "employees" && (
              <button onClick={() => openCreateEmp(empDeptTab)} style={{ background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}>+ Thêm nhân viên</button>
            )}
            <button onClick={openCreateTask} style={{ background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}>+ Tạo nhiệm vụ</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

          {/* DASHBOARD */}
          {view === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
                {[
                  { label: "Tổng nhiệm vụ", val: stats.total,      bg: "#eef2ff", col: "#4338ca" },
                  { label: "Trong hạn",     val: stats.on_time,    bg: "#dcfce7", col: "#15803d" },
                  { label: "Sắp hết hạn",   val: stats.nearly_due, bg: "#fef9c3", col: "#92400e" },
                  { label: "Quá hạn",       val: stats.overdue,    bg: "#fee2e2", col: "#b91c1c" },
                  { label: "Hoàn thành",    val: stats.completed,  bg: "#e0e7ff", col: "#4338ca" },
                ].map(c => (
                  <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 28, fontWeight: 600, color: c.col }}>{c.val}</div>
                    <div style={{ fontSize: 12, color: c.col, opacity: 0.8, marginTop: 4 }}>{c.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Nhiệm vụ theo phòng ban</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={deptChart} barSize={12}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip />
                      <Bar dataKey="Trong hạn" fill="#16a34a" radius={[3,3,0,0]} /><Bar dataKey="Sắp hết hạn" fill="#ca8a04" radius={[3,3,0,0]} />
                      <Bar dataKey="Quá hạn" fill="#dc2626" radius={[3,3,0,0]} /><Bar dataKey="Hoàn thành" fill="#6366f1" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Tỷ lệ trạng thái</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={[{name:"Trong hạn",value:stats.on_time},{name:"Sắp hết hạn",value:stats.nearly_due},{name:"Quá hạn",value:stats.overdue},{name:"Hoàn thành",value:stats.completed}]}
                        cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({name,value})=>value>0?`${name}(${value})`:""} labelLine={false} style={{fontSize:10}}>
                        {["#16a34a","#ca8a04","#dc2626","#6366f1"].map((c,i)=><Cell key={i} fill={c}/>)}
                      </Pie><Tooltip/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[{s:"overdue",title:"Quá hạn",border:"#fca5a5",hdr:"#fef2f2"},{s:"nearly_due",title:"Sắp hết hạn",border:"#fde68a",hdr:"#fefce8"}].map(({s,title,border,hdr})=>{
                  const list = computed.filter(t=>t.status===s);
                  return (
                    <div key={s} style={{background:"#fff",borderRadius:10,border:`1px solid ${border}`,overflow:"hidden"}}>
                      <div style={{background:hdr,padding:"8px 14px",display:"flex",alignItems:"center",gap:8}}>
                        <span style={{width:8,height:8,borderRadius:"50%",background:STATUS[s].dot}}/>
                        <span style={{fontWeight:600,fontSize:13,color:STATUS[s].col}}>{title} ({list.length})</span>
                      </div>
                      <div style={{maxHeight:160,overflowY:"auto"}}>
                        {list.length===0
                          ? <div style={{padding:16,textAlign:"center",color:"#9ca3af",fontSize:13}}>Không có nhiệm vụ</div>
                          : list.map(t=>(
                            <div key={t.id} onClick={()=>setModal(t)} style={{padding:"9px 14px",borderBottom:"1px solid #f3f4f6",cursor:"pointer"}}>
                              <div style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                              <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{t.dept} · {getEmp(t.eid)?.name||"–"} · {t.deadline}</div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TASK LIST */}
          {view === "tasks" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "10px 14px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Tìm kiếm nhiệm vụ..." style={{ ...inp, flex: 1, minWidth: 160 }} />
                {[
                  { val: fStatus, set: setFStatus, opts: [["all","Tất cả trạng thái"],["on_time","Trong hạn"],["nearly_due","Sắp hết hạn"],["overdue","Quá hạn"],["completed","Hoàn thành"]] },
                  { val: fDept, set: setFDept, opts: [["all","Tất cả phòng"],...DEPTS.map(d=>[d,d])] },
                  { val: fEid, set: setFEid, opts: [["all","Tất cả nhân viên"],...(employees||[]).map(e=>[e.id,e.name])] },
                ].map((f,i)=>(
                  <select key={i} value={f.val} onChange={e=>f.set(e.target.value)} style={{...inp,width:"auto",padding:"6px 8px"}}>
                    {f.opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                ))}
                <span style={{fontSize:12,color:"#9ca3af"}}>{filtered.length} kết quả</span>
              </div>
              <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {[["Tiêu đề","30%"],["Phòng","9%"],["Nhân viên","13%"],["Ưu tiên","9%"],["Hạn chót","11%"],["Trạng thái","12%"],["File","6%"],["","10%"]].map(([h,w])=>(
                        <th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:600,color:"#6b7280",borderBottom:"1px solid #e5e7eb",width:w}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length===0 && <tr><td colSpan={8} style={{padding:24,textAlign:"center",color:"#9ca3af"}}>Không có nhiệm vụ nào</td></tr>}
                    {filtered.map(t=>{
                      const atts = parseAttachments(t.attachments);
                      return (
                        <tr key={t.id} style={{borderBottom:"1px solid #f3f4f6"}}>
                          <td style={{padding:"9px 12px"}}>
                            <div onClick={()=>setModal(t)} style={{fontWeight:500,cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
                              onMouseEnter={e=>e.target.style.color="#4f46e5"} onMouseLeave={e=>e.target.style.color="#111"}>{t.title}</div>
                          </td>
                          <td style={{padding:"9px 12px"}}>
                            <span style={{background:DEPT_COLOR[t.dept]+"22",color:DEPT_COLOR[t.dept],fontSize:11,padding:"2px 7px",borderRadius:8}}>{t.dept}</span>
                          </td>
                          <td style={{padding:"9px 12px",color:"#6b7280",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{getEmp(t.eid)?.name||"–"}</td>
                          <td style={{padding:"9px 12px"}}><PChip p={t.prio}/></td>
                          <td style={{padding:"9px 12px",fontSize:12,color:t.status==="overdue"?"#b91c1c":"#6b7280",fontWeight:t.status==="overdue"?600:400}}>{t.deadline}</td>
                          <td style={{padding:"9px 12px"}}><Chip s={t.status}/></td>
                          <td style={{padding:"9px 12px",textAlign:"center"}}>
                            {atts.length>0 && <span style={{fontSize:12,background:"#f1f5f9",color:"#475569",padding:"2px 6px",borderRadius:8}}>📎{atts.length}</span>}
                          </td>
                          <td style={{padding:"9px 12px"}}>
                            <div style={{display:"flex",gap:3}}>
                              <button onClick={()=>toggleDone(t)} style={{padding:"3px 6px",border:"1px solid #d1d5db",borderRadius:5,background:t.completed?"#f9fafb":"#dcfce7",cursor:"pointer",fontSize:12,color:t.completed?"#6b7280":"#15803d"}}>✓</button>
                              <button onClick={()=>openEditTask(t)} style={{padding:"3px 6px",border:"1px solid #d1d5db",borderRadius:5,background:"#f9fafb",cursor:"pointer",fontSize:12}}>✏️</button>
                              <button onClick={()=>deleteTaskFn(t.id)} style={{padding:"3px 6px",border:"1px solid #fca5a5",borderRadius:5,background:"#fff0f0",cursor:"pointer",fontSize:12,color:"#dc2626"}}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* EMPLOYEES */}
          {view === "employees" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {DEPTS.map(d => (
                  <button key={d} onClick={() => setEmpDeptTab(d)} style={{ padding: "7px 18px", border: `2px solid ${empDeptTab===d?DEPT_COLOR[d]:"#d1d5db"}`, borderRadius: 8, background: empDeptTab===d?DEPT_COLOR[d]+"18":"#fff", color: empDeptTab===d?DEPT_COLOR[d]:"#6b7280", fontWeight: empDeptTab===d?600:400, cursor: "pointer", fontSize: 13 }}>
                    Phòng {d} ({deptEmps(d).length})
                  </button>
                ))}
              </div>
              <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb" }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Phòng {empDeptTab} — {deptEmps(empDeptTab).length} nhân viên</span>
                  <button onClick={() => openCreateEmp(empDeptTab)} style={{ background: DEPT_COLOR[empDeptTab], color: "#fff", border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>+ Thêm</button>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {[["Họ và tên","30%"],["Chức vụ","20%"],["Đang thực hiện","18%"],["Sắp hết hạn","14%"],["Quá hạn","10%"],["","8%"]].map(([h,w])=>(
                        <th key={h} style={{padding:"8px 14px",textAlign:"left",fontSize:11,fontWeight:600,color:"#6b7280",borderBottom:"1px solid #e5e7eb",width:w}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deptEmps(empDeptTab).length===0 && <tr><td colSpan={6} style={{padding:24,textAlign:"center",color:"#9ca3af"}}>Chưa có nhân viên.</td></tr>}
                    {deptEmps(empDeptTab).map(emp=>{
                      const et=computed.filter(t=>t.eid===emp.id);
                      const ov=et.filter(t=>t.status==="overdue").length, nd=et.filter(t=>t.status==="nearly_due").length, ac=et.filter(t=>!t.completed).length;
                      return (
                        <tr key={emp.id} style={{borderBottom:"1px solid #f3f4f6"}}>
                          <td style={{padding:"10px 14px",fontWeight:500}}>{emp.name}</td>
                          <td style={{padding:"10px 14px",color:"#6b7280"}}>{emp.role}</td>
                          <td style={{padding:"10px 14px"}}>{ac>0?<span style={{background:"#e0e7ff",color:"#4338ca",fontSize:12,padding:"2px 8px",borderRadius:8}}>{ac} nhiệm vụ</span>:<span style={{color:"#9ca3af",fontSize:12}}>Không có</span>}</td>
                          <td style={{padding:"10px 14px"}}>{nd>0?<span style={{background:"#fef9c3",color:"#92400e",fontSize:12,padding:"2px 8px",borderRadius:8}}>⚠ {nd}</span>:"–"}</td>
                          <td style={{padding:"10px 14px"}}>{ov>0?<span style={{background:"#fee2e2",color:"#b91c1c",fontSize:12,padding:"2px 8px",borderRadius:8}}>! {ov}</span>:"–"}</td>
                          <td style={{padding:"10px 14px"}}>
                            <div style={{display:"flex",gap:4}}>
                              <button onClick={()=>openEditEmp(emp)} style={{padding:"3px 7px",border:"1px solid #d1d5db",borderRadius:5,background:"#f9fafb",cursor:"pointer",fontSize:12}}>✏️</button>
                              <button onClick={()=>deleteEmployee(emp.id)} style={{padding:"3px 7px",border:"1px solid #fca5a5",borderRadius:5,background:"#fff0f0",cursor:"pointer",fontSize:12,color:"#dc2626"}}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TASK FORM MODAL */}
      {taskForm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:"#fff",borderRadius:12,width:480,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff",zIndex:1}}>
              <span style={{fontWeight:600,fontSize:15}}>{taskForm.editId?"Chỉnh sửa nhiệm vụ":"Tạo nhiệm vụ mới"}</span>
              <button onClick={()=>setTaskForm(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button>
            </div>
            <div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Tiêu đề *</label>
                <input value={taskForm.data.title} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,title:e.target.value}}))} placeholder="Nhập tiêu đề..." style={inp}/>
              </div>
              <div>
                <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Mô tả</label>
                <textarea value={taskForm.data.description} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,description:e.target.value}}))} rows={2} style={{...inp,resize:"vertical"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Phòng ban</label>
                  <select value={taskForm.data.dept} onChange={e=>changeTaskDept(e.target.value)} style={inp}>{DEPTS.map(d=><option key={d} value={d}>{d}</option>)}</select>
                </div>
                <div>
                  <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Nhân viên</label>
                  <select value={taskForm.data.eid} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,eid:e.target.value}}))} style={inp}>
                    {(employees||[]).filter(e=>e.dept===taskForm.data.dept).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Ưu tiên</label>
                  <select value={taskForm.data.prio} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,prio:e.target.value}}))} style={inp}>
                    <option value="high">Cao</option><option value="medium">Trung bình</option><option value="low">Thấp</option>
                  </select>
                </div>
                <div>
                  <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Hạn chót *</label>
                  <input type="date" value={taskForm.data.deadline} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,deadline:e.target.value}}))} style={inp}/>
                </div>
              </div>

              {/* FILE ATTACHMENT */}
              <div>
                <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:6}}>📎 Đính kèm file</label>
                <label style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",border:"1.5px dashed #d1d5db",borderRadius:8,cursor:"pointer",background:"#f9fafb",fontSize:13,color:"#6b7280"}}>
                  <span>🗂️</span>
                  <span>{uploadingFiles?"Đang upload...":"Chọn file (PDF, Word, Excel, ảnh…)"}</span>
                  <input type="file" multiple style={{display:"none"}} disabled={uploadingFiles}
                    onChange={async e => {
                      const files = Array.from(e.target.files);
                      if (!files.length) return;
                      const existing = parseAttachments(taskForm.data.attachments);
                      const updated = await uploadFiles(files, existing);
                      setTaskForm(f=>({...f,data:{...f.data,attachments:JSON.stringify(updated)}}));
                      e.target.value = "";
                    }}
                  />
                </label>
                {parseAttachments(taskForm.data.attachments).length > 0 && (
                  <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:4}}>
                    {parseAttachments(taskForm.data.attachments).map((att,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",background:"#f1f5f9",borderRadius:6,fontSize:12}}>
                        <span>{getFileIcon(att.name)} {att.name}</span>
                        <button onClick={()=>removeAttachment(taskForm.data,i)} style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",fontSize:14}}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"flex-end",gap:8,position:"sticky",bottom:0,background:"#fff"}}>
              <button onClick={()=>setTaskForm(null)} style={{padding:"7px 16px",border:"1px solid #d1d5db",borderRadius:7,background:"none",cursor:"pointer",fontSize:13}}>Hủy</button>
              <button onClick={submitTask} disabled={saving||uploadingFiles} style={{padding:"7px 16px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13}}>
                {saving?"Đang lưu…":taskForm.editId?"Cập nhật":"Tạo nhiệm vụ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE FORM MODAL */}
      {empForm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:"#fff",borderRadius:12,width:380,boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:600,fontSize:15}}>{empForm.editId?"Chỉnh sửa nhân viên":"Thêm nhân viên mới"}</span>
              <button onClick={()=>setEmpForm(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button>
            </div>
            <div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Họ và tên *</label>
                <input value={empForm.data.name} onChange={e=>setEmpForm(f=>({...f,data:{...f.data,name:e.target.value}}))} placeholder="Nguyễn Văn A..." style={inp}/>
              </div>
              <div>
                <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Phòng ban</label>
                <select value={empForm.data.dept} onChange={e=>setEmpForm(f=>({...f,data:{...f.data,dept:e.target.value}}))} style={inp}>{DEPTS.map(d=><option key={d} value={d}>Phòng {d}</option>)}</select>
              </div>
              <div>
                <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Chức vụ</label>
                <select value={empForm.data.role} onChange={e=>setEmpForm(f=>({...f,data:{...f.data,role:e.target.value}}))} style={inp}>{ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select>
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setEmpForm(null)} style={{padding:"7px 16px",border:"1px solid #d1d5db",borderRadius:7,background:"none",cursor:"pointer",fontSize:13}}>Hủy</button>
              <button onClick={submitEmp} disabled={saving} style={{padding:"7px 16px",background:"#0ea5e9",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13}}>{empForm.editId?"Cập nhật":"Thêm nhân viên"}</button>
            </div>
          </div>
        </div>
      )}

      {/* TASK DETAIL MODAL */}
      {modal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:"#fff",borderRadius:12,width:460,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff"}}>
              <span style={{fontWeight:600,fontSize:15}}>Chi tiết nhiệm vụ</span>
              <button onClick={()=>setModal(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button>
            </div>
            <div style={{padding:18}}>
              <div style={{fontWeight:600,fontSize:16,marginBottom:8}}>{modal.title}</div>
              {modal.description && <div style={{fontSize:13,color:"#6b7280",marginBottom:14}}>{modal.description}</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,fontSize:13}}>
                {[
                  ["Phòng ban",<span style={{background:DEPT_COLOR[modal.dept]+"22",color:DEPT_COLOR[modal.dept],padding:"2px 7px",borderRadius:8,fontSize:12}}>{modal.dept}</span>],
                  ["Nhân viên",getEmp(modal.eid)?.name||"–"],
                  ["Ưu tiên",<PChip p={modal.prio}/>],
                  ["Hạn chót",<span style={{color:modal.status==="overdue"?"#b91c1c":"#111",fontWeight:modal.status==="overdue"?600:400}}>{modal.deadline}</span>],
                  ["Trạng thái",<Chip s={modal.status}/>],
                  ["Ngày tạo",modal.created||"–"],
                ].map(([k,v])=>(
                  <div key={k}><div style={{fontSize:11,color:"#9ca3af",marginBottom:3}}>{k}</div><div>{v}</div></div>
                ))}
              </div>

              {/* Attachments in detail */}
              {parseAttachments(modal.attachments).length > 0 && (
                <div style={{marginTop:16}}>
                  <div style={{fontSize:12,color:"#9ca3af",marginBottom:8}}>📎 File đính kèm ({parseAttachments(modal.attachments).length})</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {parseAttachments(modal.attachments).map((att,i)=>(
                      <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                        style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#f1f5f9",borderRadius:8,textDecoration:"none",color:"#1e40af",fontSize:13}}>
                        <span style={{fontSize:18}}>{getFileIcon(att.name)}</span>
                        <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{att.name}</span>
                        <span style={{fontSize:11,color:"#6b7280",flexShrink:0}}>⬇ Tải về</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",position:"sticky",bottom:0,background:"#fff"}}>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{toggleDone(modal);setModal(null);}} style={{padding:"7px 14px",border:"1px solid #d1d5db",borderRadius:7,background:modal.completed?"#f9fafb":"#dcfce7",cursor:"pointer",fontSize:12,color:modal.completed?"#6b7280":"#15803d"}}>
                  {modal.completed?"↩ Bỏ hoàn thành":"✓ Hoàn thành"}
                </button>
                <button onClick={()=>{openEditTask(modal);setModal(null);}} style={{padding:"7px 14px",border:"1px solid #d1d5db",borderRadius:7,background:"#f9fafb",cursor:"pointer",fontSize:12}}>✏️ Sửa</button>
              </div>
              <button onClick={()=>deleteTaskFn(modal.id)} style={{padding:"7px 14px",border:"1px solid #fca5a5",borderRadius:7,background:"#fff0f0",cursor:"pointer",fontSize:12,color:"#dc2626"}}>🗑️ Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      {exModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:"#fff",borderRadius:12,width:380,boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:600,fontSize:15}}>📤 Xuất báo cáo CSV</span>
              <button onClick={()=>setExModal(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button>
            </div>
            <div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}>
              <p style={{fontSize:13,color:"#6b7280",margin:0}}>File CSV mở được bằng Excel, bao gồm cả tên file đính kèm.</p>
              <div>
                <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Trạng thái</label>
                <select value={exStatus} onChange={e=>setExStatus(e.target.value)} style={inp}>
                  <option value="all">Tất cả</option><option value="on_time">Trong hạn</option>
                  <option value="nearly_due">Sắp hết hạn</option><option value="overdue">Quá hạn</option><option value="completed">Hoàn thành</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Phòng ban</label>
                <select value={exDept} onChange={e=>setExDept(e.target.value)} style={inp}>
                  <option value="all">Tất cả</option>{DEPTS.map(d=><option key={d} value={d}>Phòng {d}</option>)}
                </select>
              </div>
              <div style={{background:"#f9fafb",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#6b7280"}}>
                Sẽ xuất <strong style={{color:"#111"}}>{computed.filter(t=>(exStatus==="all"||t.status===exStatus)&&(exDept==="all"||t.dept===exDept)).length}</strong> nhiệm vụ
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setExModal(false)} style={{padding:"7px 16px",border:"1px solid #d1d5db",borderRadius:7,background:"none",cursor:"pointer",fontSize:13}}>Hủy</button>
              <button onClick={exportCSV} style={{padding:"7px 16px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13}}>⬇️ Tải xuống CSV</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}