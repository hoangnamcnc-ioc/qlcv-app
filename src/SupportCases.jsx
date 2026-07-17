import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase";
import { DEPTS, DEPT_COLOR, SUPPORT_CHANNELS, SUPPORT_CHANNELS_BY_CATEGORY, SUPPORT_CONTENT_LABEL, SUPPORT_DIFFICULTY, SUPPORT_CATEGORIES } from "./constants";
import { todayStr, getFileIcon, parseJSON, getPreviewUrl, fmtDate } from "./helpers";

// ───── Hỗ trợ người dùng/PAHT và vận hành DC — nền tảng số dùng chung (điện thoại/Zalo) ─────
// Mỗi trường hợp ghi nhận xong là tính "hoàn thành" ngay (không có bước duyệt) — quy đổi thành điểm hiệu suất
// theo trọng số độ khó trong useReports.js (Khó=1, Trung bình=1/2, Nhanh=1/4 nhiệm vụ).
export default function SupportCases({ currentUser, employees, getEmp, isMobile, inp, showToast, onScoringChange, uploadFiles, uploadingFiles }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [catTab, setCatTab] = useState("support"); // "support" (Hỗ trợ ND & PAHT) | "datacenter" (Xử lý lỗi TTDL)
  const [dateFrom, setDateFrom] = useState(""); const [dateTo, setDateTo] = useState("");
  const [fEid, setFEid] = useState("all"); const [fChannel, setFChannel] = useState("all");
  const [showTrash, setShowTrash] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const myEid = currentUser?.employee_id;
  const canManage = ["admin", "director", "manager_hcth", "manager", "deputy_manager"].includes(currentUser?.role);

  // Người xử lý chỉ chọn trong phạm vi phòng ban phù hợp từng tab:
  // "Xử lý lỗi TTDL" → chỉ HT-NTS ; "Hỗ trợ ND & PAHT" → HT-NTS + QL-KTDL
  const catDepts = catTab === "datacenter" ? ["HT-NTS"] : ["HT-NTS", "QL-KTDL"];
  const formDepts = form ? (form.category === "datacenter" ? ["HT-NTS"] : ["HT-NTS", "QL-KTDL"]) : [];
  const catEmployees = useMemo(() => (employees || []).filter(e => catDepts.includes(e.dept)), [employees, catTab]);
  const formEmployees = useMemo(() => (employees || []).filter(e => formDepts.includes(e.dept)), [employees, form?.category]);

  // Kênh tiếp nhận & nhãn nội dung khác nhau theo tab/phân loại
  const catChannels = SUPPORT_CHANNELS_BY_CATEGORY[catTab] || SUPPORT_CHANNELS_BY_CATEGORY.support;
  const formChannels = SUPPORT_CHANNELS_BY_CATEGORY[form?.category] || SUPPORT_CHANNELS_BY_CATEGORY.support;

  useEffect(() => { (async () => {
    setLoading(true);
    try { const { data } = await supabase.from("support_cases").select("*").order("created", { ascending: false }); setCases(data || []); }
    catch { showToast && showToast("Lỗi tải danh sách hỗ trợ", "error"); }
    setLoading(false);
  })(); }, []);

  const openCreate = () => { const myEmp = (employees || []).find(e => e.id === myEid); setForm({ category: catTab, channel: catChannels[0], content: "", result: "", eid: myEmp && catDepts.includes(myEmp.dept) ? myEid : "", collab_eids: [], difficulty: "medium", created: todayStr, attachments: [] }); };
  const openEdit = (c) => setForm({ ...c, collab_eids: parseJSON(c.collab_eids, []), attachments: parseJSON(c.attachments, []) });

  const saveCase = async () => {
    if (!form.content.trim() || !form.eid) { showToast && showToast("Nhập nội dung và chọn người xử lý", "error"); return; }
    if (!form.result.trim()) { showToast && showToast("Nhập kết quả giải quyết", "error"); return; }
    setSaving(true);
    if (form.id) {
      const upd = { category: form.category || "support", channel: form.channel, content: form.content.trim(), result: form.result.trim(), eid: form.eid, collab_eids: JSON.stringify(form.collab_eids || []), difficulty: form.difficulty, created: form.created || todayStr, attachments: JSON.stringify(form.attachments || []) };
      const { error } = await supabase.from("support_cases").update(upd).eq("id", form.id);
      if (!error) { setCases(p => p.map(x => x.id === form.id ? { ...x, ...upd } : x)); showToast && showToast("Đã cập nhật"); setForm(null); onScoringChange?.(); }
      else showToast && showToast("Lỗi: " + (error.message || ""), "error");
    } else {
      const c = { id: `sc${Date.now()}`, category: form.category || "support", channel: form.channel, content: form.content.trim(), result: form.result.trim(), eid: form.eid, collab_eids: JSON.stringify(form.collab_eids || []), difficulty: form.difficulty, created: form.created || todayStr, created_by: currentUser.full_name, attachments: JSON.stringify(form.attachments || []) };
      const { error } = await supabase.from("support_cases").insert(c);
      if (!error) { setCases(p => [c, ...p]); showToast && showToast("Đã ghi nhận trường hợp hỗ trợ"); setForm(null); onScoringChange?.(); }
      else showToast && showToast("Lỗi: " + (error.message || ""), "error");
    }
    setSaving(false);
  };

  // Xóa mềm — chuyển vào Thùng rác thay vì mất vĩnh viễn ngay, để Trưởng/Phó phòng/BGĐ còn rà soát lại được
  const deleteCase = async (id) => {
    if (!window.confirm("Chuyển trường hợp này vào thùng rác?")) return;
    const { error } = await supabase.from("support_cases").update({ deleted: true }).eq("id", id);
    if (!error) { setCases(p => p.map(x => x.id === id ? { ...x, deleted: true } : x)); onScoringChange?.(); }
    else showToast && showToast("Lỗi: " + (error.message || ""), "error");
  };
  const restoreCase = async (id) => {
    const { error } = await supabase.from("support_cases").update({ deleted: false }).eq("id", id);
    if (!error) { setCases(p => p.map(x => x.id === id ? { ...x, deleted: false } : x)); showToast && showToast("Đã khôi phục"); onScoringChange?.(); }
    else showToast && showToast("Lỗi: " + (error.message || ""), "error");
  };
  const purgeCase = async (id) => {
    if (!window.confirm("Xóa VĨNH VIỄN trường hợp này? Không thể hoàn tác.")) return;
    const { error } = await supabase.from("support_cases").delete().eq("id", id);
    if (!error) setCases(p => p.filter(c => c.id !== id));
    else showToast && showToast("Lỗi: " + (error.message || ""), "error");
  };
  // Xác nhận đã rà soát — cho Trưởng/Phó phòng/BGĐ kiểm soát các trường hợp tự ghi nhận, hạn chế lạm dụng
  const verifyCase = async (c) => {
    const upd = { verified_by: currentUser.full_name, verified_at: todayStr };
    const { error } = await supabase.from("support_cases").update(upd).eq("id", c.id);
    if (!error) { setCases(p => p.map(x => x.id === c.id ? { ...x, ...upd } : x)); showToast && showToast("Đã xác nhận"); }
    else showToast && showToast("Lỗi: " + (error.message || ""), "error");
  };

  const filtered = useMemo(() => cases.filter(c =>
    !!c.deleted === showTrash &&
    (c.category || "support") === catTab &&
    (fEid === "all" || c.eid === fEid) &&
    (fChannel === "all" || c.channel === fChannel) &&
    (!dateFrom || c.created >= dateFrom) &&
    (!dateTo || c.created <= dateTo)
  ), [cases, showTrash, catTab, fEid, fChannel, dateFrom, dateTo]);

  useEffect(() => { setPage(1); }, [showTrash, catTab, fEid, fChannel, dateFrom, dateTo]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const exportCSV = () => {
    const header = ["Ngày xử lý", "Phân loại", "Kênh", "Nội dung", "Kết quả giải quyết", "Người xử lý chính", "Phòng ban", "Phối hợp", "Độ khó", "Quy đổi việc", "Xác nhận"];
    const rows = filtered.map(c => { const emp = getEmp(c.eid); return [
      c.created, SUPPORT_CATEGORIES[c.category || "support"]?.label || "", SUPPORT_CHANNELS[c.channel]?.label || "",
      `"${(c.content || "").replace(/"/g, '""')}"`, `"${(c.result || "").replace(/"/g, '""')}"`,
      emp?.name || "", emp?.dept || "", `"${parseJSON(c.collab_eids, []).map(id => getEmp(id)?.name).filter(Boolean).join("; ")}"`, SUPPORT_DIFFICULTY[c.difficulty]?.label || "", SUPPORT_DIFFICULTY[c.difficulty]?.weight ?? "",
      c.verified_by ? `Đã xác nhận (${c.verified_by})` : "Chưa xác nhận",
    ].join(","); });
    const csv = "﻿" + [header.join(","), ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = `ho-tro-${SUPPORT_CATEGORIES[catTab]?.label || catTab}-${todayStr}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const weight = c => SUPPORT_DIFFICULTY[c.difficulty]?.weight ?? 0.5;
    const totalWeight = Math.round(filtered.reduce((s, c) => s + weight(c), 0) * 100) / 100;
    const byChannel = Object.fromEntries(Object.keys(SUPPORT_CHANNELS).map(k => [k, filtered.filter(c => c.channel === k).length]));
    return { total: filtered.length, totalWeight, byChannel };
  }, [filtered]);

  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", gap: 8, background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 8 }}>
      {Object.entries(SUPPORT_CATEGORIES).map(([k, v]) => (
        <button key={k} onClick={() => { setCatTab(k); setFEid("all"); setFChannel("all"); }} style={{ flex: 1, padding: "9px 8px", border: "none", borderRadius: 7, background: catTab === k ? "#059669" : "transparent", color: catTab === k ? "#fff" : "#6b7280", cursor: "pointer", fontSize: isMobile ? 12 : 13, fontWeight: catTab === k ? 600 : 400 }}>{v.icon} {v.label}</button>
      ))}
    </div>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
      <button onClick={exportCSV} style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, padding: isMobile ? "6px 12px" : "7px 16px", fontSize: isMobile ? 12 : 13, cursor: "pointer", fontWeight: 500 }}>📤 Xuất CSV</button>
      {canManage && <button onClick={() => setShowTrash(v => !v)} style={{ background: showTrash ? "#fef2f2" : "#fff", color: showTrash ? "#dc2626" : "#374151", border: "1px solid " + (showTrash ? "#fecaca" : "#d1d5db"), borderRadius: 8, padding: isMobile ? "6px 12px" : "7px 16px", fontSize: isMobile ? 12 : 13, cursor: "pointer", fontWeight: 500 }}>🗑️ {showTrash ? "Đang xem thùng rác" : "Thùng rác"}</button>}
      {!showTrash && <button onClick={openCreate} style={{ background: "#059669", color: "#fff", border: "none", borderRadius: 8, padding: isMobile ? "6px 12px" : "7px 16px", fontSize: isMobile ? 12 : 13, cursor: "pointer", fontWeight: 500 }}>+ Ghi nhận {SUPPORT_CATEGORIES[catTab]?.label.toLowerCase()}</button>}
    </div>

    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "10px 12px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "#6b7280" }}>📅 Từ ngày</span>
      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inp, width: "auto" }} />
      <span style={{ fontSize: 12, color: "#6b7280" }}>Đến ngày</span>
      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inp, width: "auto" }} />
      <select value={fChannel} onChange={e => setFChannel(e.target.value)} style={{ ...inp, width: "auto" }}>
        <option value="all">Tất cả kênh</option>
        {catChannels.map(k => <option key={k} value={k}>{SUPPORT_CHANNELS[k]?.icon} {SUPPORT_CHANNELS[k]?.label}</option>)}
      </select>
      <select value={fEid} onChange={e => setFEid(e.target.value)} style={{ ...inp, width: "auto" }}>
        <option value="all">Tất cả người xử lý</option>
        {catEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }}>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 14 }}><div style={{ fontSize: 11, color: "#6b7280" }}>Số trường hợp</div><div style={{ fontSize: 22, fontWeight: 700, color: "#059669" }}>{stats.total}</div></div>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 14 }}><div style={{ fontSize: 11, color: "#6b7280" }}>Quy đổi việc</div><div style={{ fontSize: 22, fontWeight: 700, color: "#4338ca" }}>{stats.totalWeight}</div></div>
      {catChannels.map(k => (
        <div key={k} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 14 }}><div style={{ fontSize: 11, color: "#6b7280" }}>{SUPPORT_CHANNELS[k]?.icon} {SUPPORT_CHANNELS[k]?.label}</div><div style={{ fontSize: 22, fontWeight: 700, color: "#1d4ed8" }}>{stats.byChannel[k]}</div></div>
      ))}
    </div>

    {loading ? (
      <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Đang tải…</div>
    ) : filtered.length === 0 ? (
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 40, textAlign: "center", color: "#9ca3af" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>{showTrash ? "🗑️" : SUPPORT_CATEGORIES[catTab]?.icon}</div>
        <div>{showTrash ? "Thùng rác trống" : "Chưa có trường hợp nào"}</div>
      </div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {paged.map(c => {
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
                {parseJSON(c.attachments, []).length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>{parseJSON(c.attachments, []).map((f, i) => <a key={i} href={getPreviewUrl(f.url, f.name)} target="_blank" rel="noreferrer" style={{ fontSize: 11, background: "#eef2ff", color: "#4338ca", padding: "2px 8px", borderRadius: 6, textDecoration: "none" }}>{getFileIcon(f.name)} {f.name}</a>)}</div>}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5, alignItems: "center" }}>
                  <span style={{ background: DEPT_COLOR[emp?.dept] + "22", color: DEPT_COLOR[emp?.dept], fontSize: 11, padding: "2px 7px", borderRadius: 8 }}>{emp?.name || "–"}</span>
                  {parseJSON(c.collab_eids, []).length > 0 && <span style={{ background: "#f5f3ff", color: "#7c3aed", fontSize: 11, padding: "2px 7px", borderRadius: 8 }}>🤝 {parseJSON(c.collab_eids, []).map(id => getEmp(id)?.name).filter(Boolean).join(", ")}</span>}
                  <span style={{ background: SUPPORT_DIFFICULTY[c.difficulty]?.icon ? "#f1f5f9" : "transparent", fontSize: 11, padding: "2px 7px", borderRadius: 8, color: "#475569" }}>{SUPPORT_DIFFICULTY[c.difficulty]?.icon} {SUPPORT_DIFFICULTY[c.difficulty]?.label} ({SUPPORT_DIFFICULTY[c.difficulty]?.weight} việc)</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>📅 {fmtDate(c.created)}</span>
                  {c.verified_by ? (
                    <span title={`Xác nhận bởi ${c.verified_by} ngày ${c.verified_at}`} style={{ background: "#ecfdf5", color: "#059669", fontSize: 11, padding: "2px 7px", borderRadius: 8, border: "1px solid #a7f3d0" }}>✔️ Đã xác nhận</span>
                  ) : canManage && !showTrash ? (
                    <button onClick={() => verifyCase(c)} style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a", fontSize: 11, padding: "2px 7px", borderRadius: 8, cursor: "pointer" }}>⏳ Xác nhận</button>
                  ) : null}
                </div>
              </div>
              {showTrash ? (
                <>
                  {(canManage || c.eid === myEid) && <button onClick={() => restoreCase(c.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#15803d", flexShrink: 0 }} title="Khôi phục">↩️</button>}
                  {canManage && <button onClick={() => purgeCase(c.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#dc2626", flexShrink: 0 }} title="Xóa vĩnh viễn">🗑️</button>}
                </>
              ) : (
                <>
                  {(canManage || c.eid === myEid) && <button onClick={() => openEdit(c)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#6b7280", flexShrink: 0 }}>✏️</button>}
                  {canDelete && <button onClick={() => deleteCase(c.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#dc2626", flexShrink: 0 }}>🗑️</button>}
                </>
              )}
            </div>
          );
        })}
      </div>
    )}

    {filtered.length > PAGE_SIZE && (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, padding: "6px 0" }}>
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: 7, background: "#fff", cursor: page === 1 ? "default" : "pointer", opacity: page === 1 ? 0.5 : 1, fontSize: 13 }}>◀</button>
        <span style={{ fontSize: 13, color: "#6b7280" }}>Trang {page}/{totalPages}</span>
        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: 7, background: "#fff", cursor: page === totalPages ? "default" : "pointer", opacity: page === totalPages ? 0.5 : 1, fontSize: 13 }}>▶</button>
      </div>
    )}

    {form && (<div onClick={() => setForm(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: isMobile ? "12px 8px" : 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontWeight: 600, fontSize: 15 }}>{SUPPORT_CATEGORIES[form.category]?.icon || "🎧"} {form.id ? "Sửa" : "Ghi nhận"} trường hợp</span><button onClick={() => setForm(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9ca3af" }}>✕</button></div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Phân loại</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(SUPPORT_CATEGORIES).map(([k, v]) => (
                <button key={k} onClick={() => setForm(f => { const nextDepts = k === "datacenter" ? ["HT-NTS"] : ["HT-NTS", "QL-KTDL"]; const emp = (employees || []).find(e => e.id === f.eid); const nextChannels = SUPPORT_CHANNELS_BY_CATEGORY[k] || SUPPORT_CHANNELS_BY_CATEGORY.support; return { ...f, category: k, eid: emp && nextDepts.includes(emp.dept) ? f.eid : "", collab_eids: (f.collab_eids || []).filter(id => { const ce = (employees || []).find(x => x.id === id); return ce && nextDepts.includes(ce.dept); }), channel: nextChannels.includes(f.channel) ? f.channel : nextChannels[0] }; })} style={{ flex: "1 1 45%", padding: "8px 6px", border: "2px solid " + (form.category === k ? "#059669" : "#e5e7eb"), borderRadius: 8, background: form.category === k ? "#f0fdf4" : "#fff", cursor: "pointer", fontSize: 12.5 }}>{v.icon} {v.label}</button>
              ))}
            </div>
          </div>
          <div><label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Kênh tiếp nhận</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {formChannels.map(k => (
                <button key={k} onClick={() => setForm(f => ({ ...f, channel: k }))} style={{ flex: "1 1 45%", padding: "8px 6px", border: "2px solid " + (form.channel === k ? "#059669" : "#e5e7eb"), borderRadius: 8, background: form.channel === k ? "#f0fdf4" : "#fff", cursor: "pointer", fontSize: 12.5 }}>{SUPPORT_CHANNELS[k]?.icon} {SUPPORT_CHANNELS[k]?.label}</button>
              ))}
            </div>
          </div>
          <div><label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>{SUPPORT_CONTENT_LABEL[form.category] || SUPPORT_CONTENT_LABEL.support} *</label><textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3} placeholder="VD: Hướng dẫn khôi phục mật khẩu đăng nhập hệ thống..." style={{ ...inp, resize: "vertical" }} /></div>
          <div><label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Kết quả giải quyết *</label><textarea value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))} rows={3} placeholder="VD: Đã hướng dẫn người dùng đặt lại mật khẩu qua email, xác nhận đăng nhập thành công..." style={{ ...inp, resize: "vertical" }} /></div>
          <div><label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Người xử lý chính</label><select value={form.eid} onChange={e => setForm(f => ({ ...f, eid: e.target.value, collab_eids: (f.collab_eids || []).filter(id => id !== e.target.value) }))} style={inp}><option value="">— Chọn —</option>{formEmployees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.dept})</option>)}</select></div>
          <div><label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Nhân viên phối hợp (tùy chọn)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {formEmployees.filter(e => e.id !== form.eid).map(e => { const on = (form.collab_eids || []).includes(e.id); return (
                <button key={e.id} type="button" onClick={() => setForm(f => { const cur = f.collab_eids || []; return { ...f, collab_eids: on ? cur.filter(id => id !== e.id) : [...cur, e.id] }; })} style={{ padding: "5px 10px", border: "1.5px solid " + (on ? "#059669" : "#e5e7eb"), borderRadius: 999, background: on ? "#f0fdf4" : "#fff", color: on ? "#059669" : "#6b7280", cursor: "pointer", fontSize: 12 }}>{on ? "✓ " : ""}{e.name} ({e.dept})</button>
              ); })}
              {formEmployees.filter(e => e.id !== form.eid).length === 0 && <span style={{ fontSize: 12, color: "#9ca3af" }}>Không có nhân viên khác trong phạm vi phòng ban</span>}
            </div>
          </div>
          <div><label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Độ khó</label>
            <div style={{ display: "flex", gap: 8 }}>
              {Object.entries(SUPPORT_DIFFICULTY).map(([k, v]) => (
                <button key={k} onClick={() => setForm(f => ({ ...f, difficulty: k }))} style={{ flex: 1, padding: "8px 6px", border: "2px solid " + (form.difficulty === k ? "#059669" : "#e5e7eb"), borderRadius: 8, background: form.difficulty === k ? "#f0fdf4" : "#fff", cursor: "pointer", fontSize: 12.5 }}>{v.icon} {v.label}<div style={{ fontSize: 10, color: "#9ca3af" }}>{v.weight} việc</div></button>
              ))}
            </div>
          </div>
          <div><label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Ngày xử lý</label><input type="date" value={form.created} onChange={e => setForm(f => ({ ...f, created: e.target.value }))} style={inp} /></div>
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>📎 File kết quả xử lý (ảnh chụp, log, tài liệu...)</label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "1.5px dashed #d1d5db", borderRadius: 8, cursor: "pointer", background: "#f9fafb", fontSize: 13, color: "#6b7280" }}>
              <span>🗂️</span><span>{uploadingFiles ? "Đang upload..." : "Chọn file… (chọn được nhiều file cùng lúc)"}</span>
              <input type="file" multiple style={{ display: "none" }} disabled={uploadingFiles} onChange={async e => { const files = Array.from(e.target.files); if (!files.length) return; const up = await uploadFiles(files, form.attachments || []); setForm(f => ({ ...f, attachments: up })); e.target.value = ""; }} />
            </label>
            {(form.attachments || []).length > 0 && <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>{(form.attachments || []).map((f, i) => (<div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "#f1f5f9", borderRadius: 6, fontSize: 12 }}><span>{getFileIcon(f.name)} {f.name}</span><button onClick={() => setForm(fm => ({ ...fm, attachments: fm.attachments.filter((_, idx) => idx !== i) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 14 }}>✕</button></div>))}</div>}
          </div>
        </div>
        <div style={{ padding: "0 18px 18px", display: "flex", gap: 10 }}>
          <button onClick={() => setForm(null)} style={{ flex: 1, padding: "9px", border: "1px solid #d1d5db", borderRadius: 8, background: "#f9fafb", cursor: "pointer", fontSize: 13 }}>Hủy</button>
          <button disabled={saving} onClick={saveCase} style={{ flex: 2, padding: "9px", background: "#059669", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{saving ? "Đang lưu…" : form.id ? "Cập nhật" : "Lưu"}</button>
        </div>
      </div>
    </div>)}
  </div>);
}
