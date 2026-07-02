import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase";
import { DEPTS, DEPT_COLOR, SUPPORT_CHANNELS, SUPPORT_DIFFICULTY, SUPPORT_CATEGORIES } from "./constants";
import { todayStr } from "./helpers";

// ───── Hỗ trợ người dùng/PAHT và vận hành DC — nền tảng số dùng chung (điện thoại/Zalo) ─────
// Mỗi trường hợp ghi nhận xong là tính "hoàn thành" ngay (không có bước duyệt) — quy đổi thành điểm hiệu suất
// theo trọng số độ khó trong useReports.js (Khó=1, Trung bình=1/2, Nhanh=1/4 nhiệm vụ).
export default function SupportCases({ currentUser, employees, getEmp, isMobile, inp, showToast }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [catTab, setCatTab] = useState("support"); // "support" (Hỗ trợ ND & PAHT) | "datacenter" (Xử lý lỗi TTDL)
  const [dateFrom, setDateFrom] = useState(""); const [dateTo, setDateTo] = useState("");
  const [fEid, setFEid] = useState("all"); const [fChannel, setFChannel] = useState("all");

  const myEid = currentUser?.employee_id;
  const canManage = ["admin", "director", "manager_hcth", "manager", "deputy_manager"].includes(currentUser?.role);

  // Người xử lý chỉ chọn trong phạm vi phòng ban phù hợp từng tab:
  // "Xử lý lỗi TTDL" → chỉ HT-NTS ; "Hỗ trợ ND & PAHT" → HT-NTS + QL-KTDL
  const catDepts = catTab === "datacenter" ? ["HT-NTS"] : ["HT-NTS", "QL-KTDL"];
  const formDepts = form ? (form.category === "datacenter" ? ["HT-NTS"] : ["HT-NTS", "QL-KTDL"]) : [];
  const catEmployees = useMemo(() => (employees || []).filter(e => catDepts.includes(e.dept)), [employees, catTab]);
  const formEmployees = useMemo(() => (employees || []).filter(e => formDepts.includes(e.dept)), [employees, form?.category]);

  useEffect(() => { (async () => {
    setLoading(true);
    try { const { data } = await supabase.from("support_cases").select("*").order("created", { ascending: false }); setCases(data || []); }
    catch { showToast && showToast("Lỗi tải danh sách hỗ trợ", "error"); }
    setLoading(false);
  })(); }, []);

  const openCreate = () => { const myEmp = (employees || []).find(e => e.id === myEid); setForm({ category: catTab, channel: "phone", content: "", result: "", eid: myEmp && catDepts.includes(myEmp.dept) ? myEid : "", difficulty: "medium", created: todayStr }); };
  const openEdit = (c) => setForm({ ...c });

  const saveCase = async () => {
    if (!form.content.trim() || !form.eid) { showToast && showToast("Nhập nội dung và chọn người xử lý", "error"); return; }
    if (!form.result.trim()) { showToast && showToast("Nhập kết quả giải quyết", "error"); return; }
    setSaving(true);
    if (form.id) {
      const upd = { category: form.category || "support", channel: form.channel, content: form.content.trim(), result: form.result.trim(), eid: form.eid, difficulty: form.difficulty, created: form.created || todayStr };
      const { error } = await supabase.from("support_cases").update(upd).eq("id", form.id);
      if (!error) { setCases(p => p.map(x => x.id === form.id ? { ...x, ...upd } : x)); showToast && showToast("Đã cập nhật"); setForm(null); }
      else showToast && showToast("Lỗi: " + (error.message || ""), "error");
    } else {
      const c = { id: `sc${Date.now()}`, category: form.category || "support", channel: form.channel, content: form.content.trim(), result: form.result.trim(), eid: form.eid, difficulty: form.difficulty, created: form.created || todayStr, created_by: currentUser.full_name };
      const { error } = await supabase.from("support_cases").insert(c);
      if (!error) { setCases(p => [c, ...p]); showToast && showToast("Đã ghi nhận trường hợp hỗ trợ"); setForm(null); }
      else showToast && showToast("Lỗi: " + (error.message || ""), "error");
    }
    setSaving(false);
  };

  const deleteCase = async (id) => {
    if (!window.confirm("Xóa trường hợp hỗ trợ này?")) return;
    await supabase.from("support_cases").delete().eq("id", id);
    setCases(p => p.filter(c => c.id !== id));
  };

  const filtered = useMemo(() => cases.filter(c =>
    (c.category || "support") === catTab &&
    (fEid === "all" || c.eid === fEid) &&
    (fChannel === "all" || c.channel === fChannel) &&
    (!dateFrom || c.created >= dateFrom) &&
    (!dateTo || c.created <= dateTo)
  ), [cases, catTab, fEid, fChannel, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const weight = c => SUPPORT_DIFFICULTY[c.difficulty]?.weight ?? 0.5;
    const totalWeight = Math.round(filtered.reduce((s, c) => s + weight(c), 0) * 100) / 100;
    const byChannel = Object.fromEntries(Object.keys(SUPPORT_CHANNELS).map(k => [k, filtered.filter(c => c.channel === k).length]));
    return { total: filtered.length, totalWeight, byChannel };
  }, [filtered]);

  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", gap: 8, background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 8 }}>
      {Object.entries(SUPPORT_CATEGORIES).map(([k, v]) => (
        <button key={k} onClick={() => { setCatTab(k); setFEid("all"); }} style={{ flex: 1, padding: "9px 8px", border: "none", borderRadius: 7, background: catTab === k ? "#059669" : "transparent", color: catTab === k ? "#fff" : "#6b7280", cursor: "pointer", fontSize: isMobile ? 12 : 13, fontWeight: catTab === k ? 600 : 400 }}>{v.icon} {v.label}</button>
      ))}
    </div>
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <button onClick={openCreate} style={{ background: "#059669", color: "#fff", border: "none", borderRadius: 8, padding: isMobile ? "6px 12px" : "7px 16px", fontSize: isMobile ? 12 : 13, cursor: "pointer", fontWeight: 500 }}>+ Ghi nhận {SUPPORT_CATEGORIES[catTab]?.label.toLowerCase()}</button>
    </div>

    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "10px 12px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "#6b7280" }}>📅 Từ ngày</span>
      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inp, width: "auto" }} />
      <span style={{ fontSize: 12, color: "#6b7280" }}>Đến ngày</span>
      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inp, width: "auto" }} />
      <select value={fChannel} onChange={e => setFChannel(e.target.value)} style={{ ...inp, width: "auto" }}>
        <option value="all">Tất cả kênh</option>
        {Object.entries(SUPPORT_CHANNELS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
      </select>
      <select value={fEid} onChange={e => setFEid(e.target.value)} style={{ ...inp, width: "auto" }}>
        <option value="all">Tất cả người xử lý</option>
        {catEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }}>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 14 }}><div style={{ fontSize: 11, color: "#6b7280" }}>Số trường hợp</div><div style={{ fontSize: 22, fontWeight: 700, color: "#059669" }}>{stats.total}</div></div>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 14 }}><div style={{ fontSize: 11, color: "#6b7280" }}>Quy đổi việc</div><div style={{ fontSize: 22, fontWeight: 700, color: "#4338ca" }}>{stats.totalWeight}</div></div>
      {Object.entries(SUPPORT_CHANNELS).map(([k, v]) => (
        <div key={k} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 14 }}><div style={{ fontSize: 11, color: "#6b7280" }}>{v.icon} {v.label}</div><div style={{ fontSize: 22, fontWeight: 700, color: "#1d4ed8" }}>{stats.byChannel[k]}</div></div>
      ))}
    </div>

    {loading ? (
      <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Đang tải…</div>
    ) : filtered.length === 0 ? (
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 40, textAlign: "center", color: "#9ca3af" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>{SUPPORT_CATEGORIES[catTab]?.icon}</div>
        <div>Chưa có trường hợp nào</div>
      </div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(c => {
          const emp = getEmp(c.eid);
          const canDelete = canManage || c.eid === myEid;
          return (
            <div key={c.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{SUPPORT_CHANNELS[c.channel]?.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, lineHeight: 1.4 }}>{c.content}</div>
                {c.result ? (
                  <div style={{ fontSize: 12.5, lineHeight: 1.4, marginTop: 4, color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "5px 8px" }}>✅ Kết quả: {c.result}</div>
                ) : (
                  <div style={{ fontSize: 11.5, marginTop: 4, color: "#b91c1c" }}>⚠️ Thiếu nội dung kết quả giải quyết</div>
                )}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5, alignItems: "center" }}>
                  <span style={{ background: DEPT_COLOR[emp?.dept] + "22", color: DEPT_COLOR[emp?.dept], fontSize: 11, padding: "2px 7px", borderRadius: 8 }}>{emp?.name || "–"}</span>
                  <span style={{ background: SUPPORT_DIFFICULTY[c.difficulty]?.icon ? "#f1f5f9" : "transparent", fontSize: 11, padding: "2px 7px", borderRadius: 8, color: "#475569" }}>{SUPPORT_DIFFICULTY[c.difficulty]?.icon} {SUPPORT_DIFFICULTY[c.difficulty]?.label} ({SUPPORT_DIFFICULTY[c.difficulty]?.weight} việc)</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>📅 {c.created}</span>
                </div>
              </div>
              {(canManage || c.eid === myEid) && <button onClick={() => openEdit(c)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#6b7280", flexShrink: 0 }}>✏️</button>}
              {canDelete && <button onClick={() => deleteCase(c.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#dc2626", flexShrink: 0 }}>🗑️</button>}
            </div>
          );
        })}
      </div>
    )}

    {form && (<div onClick={() => setForm(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: isMobile ? "12px 8px" : 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontWeight: 600, fontSize: 15 }}>{SUPPORT_CATEGORIES[form.category]?.icon || "🎧"} {form.id ? "Sửa" : "Ghi nhận"} trường hợp</span><button onClick={() => setForm(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9ca3af" }}>✕</button></div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Phân loại</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(SUPPORT_CATEGORIES).map(([k, v]) => (
                <button key={k} onClick={() => setForm(f => { const nextDepts = k === "datacenter" ? ["HT-NTS"] : ["HT-NTS", "QL-KTDL"]; const emp = (employees || []).find(e => e.id === f.eid); return { ...f, category: k, eid: emp && nextDepts.includes(emp.dept) ? f.eid : "" }; })} style={{ flex: "1 1 45%", padding: "8px 6px", border: "2px solid " + (form.category === k ? "#059669" : "#e5e7eb"), borderRadius: 8, background: form.category === k ? "#f0fdf4" : "#fff", cursor: "pointer", fontSize: 12.5 }}>{v.icon} {v.label}</button>
              ))}
            </div>
          </div>
          <div><label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Kênh tiếp nhận</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(SUPPORT_CHANNELS).map(([k, v]) => (
                <button key={k} onClick={() => setForm(f => ({ ...f, channel: k }))} style={{ flex: "1 1 45%", padding: "8px 6px", border: "2px solid " + (form.channel === k ? "#059669" : "#e5e7eb"), borderRadius: 8, background: form.channel === k ? "#f0fdf4" : "#fff", cursor: "pointer", fontSize: 12.5 }}>{v.icon} {v.label}</button>
              ))}
            </div>
          </div>
          <div><label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Mô tả lỗi *</label><textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3} placeholder="VD: Hướng dẫn khôi phục mật khẩu đăng nhập hệ thống..." style={{ ...inp, resize: "vertical" }} /></div>
          <div><label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Kết quả giải quyết *</label><textarea value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))} rows={3} placeholder="VD: Đã hướng dẫn người dùng đặt lại mật khẩu qua email, xác nhận đăng nhập thành công..." style={{ ...inp, resize: "vertical" }} /></div>
          <div><label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Người xử lý</label><select value={form.eid} onChange={e => setForm(f => ({ ...f, eid: e.target.value }))} style={inp}><option value="">— Chọn —</option>{formEmployees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.dept})</option>)}</select></div>
          <div><label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Độ khó</label>
            <div style={{ display: "flex", gap: 8 }}>
              {Object.entries(SUPPORT_DIFFICULTY).map(([k, v]) => (
                <button key={k} onClick={() => setForm(f => ({ ...f, difficulty: k }))} style={{ flex: 1, padding: "8px 6px", border: "2px solid " + (form.difficulty === k ? "#059669" : "#e5e7eb"), borderRadius: 8, background: form.difficulty === k ? "#f0fdf4" : "#fff", cursor: "pointer", fontSize: 12.5 }}>{v.icon} {v.label}<div style={{ fontSize: 10, color: "#9ca3af" }}>{v.weight} việc</div></button>
              ))}
            </div>
          </div>
          <div><label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Ngày xử lý</label><input type="date" value={form.created} onChange={e => setForm(f => ({ ...f, created: e.target.value }))} style={inp} /></div>
        </div>
        <div style={{ padding: "0 18px 18px", display: "flex", gap: 10 }}>
          <button onClick={() => setForm(null)} style={{ flex: 1, padding: "9px", border: "1px solid #d1d5db", borderRadius: 8, background: "#f9fafb", cursor: "pointer", fontSize: 13 }}>Hủy</button>
          <button disabled={saving} onClick={saveCase} style={{ flex: 2, padding: "9px", background: "#059669", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{saving ? "Đang lưu…" : form.id ? "Cập nhật" : "Lưu"}</button>
        </div>
      </div>
    </div>)}
  </div>);
}
