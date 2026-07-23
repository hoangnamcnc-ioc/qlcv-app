import React, { useEffect, useMemo, useState } from "react";
import { fetchAllLearning, setPromoted, deleteLearning } from "./chatLearning";

// Trang admin: xem & duyệt những gì trợ lý chat đã "học" từ phản hồi người dùng.
// - 👍 = câu được xác nhận đúng · 👎 kèm "dạy lại" = câu ánh xạ sang ý đúng
// - "Thăng cấp" (⭐) = đánh dấu câu tốt thành mẫu chính thức, được ưu tiên khi định tuyến.
const strip = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
const fmt = s => { if (!s) return ""; const d = new Date(s); return isNaN(d) ? s : d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); };

export default function ChatLearningAdmin({ isMobile, showToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState("taught");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    const { rows, error } = await fetchAllLearning();
    setRows(rows); setErr(error); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total: rows.length,
    up: rows.filter(r => r.feedback === 1).length,
    down: rows.filter(r => r.feedback === -1).length,
    taught: rows.filter(r => r.corrected_q).length,
    promoted: rows.filter(r => r.promoted).length,
  }), [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (filter === "taught") r = r.filter(x => x.corrected_q);
    else if (filter === "promoted") r = r.filter(x => x.promoted);
    else if (filter === "up") r = r.filter(x => x.feedback === 1);
    else if (filter === "down") r = r.filter(x => x.feedback === -1 && !x.corrected_q);
    if (q.trim()) { const s = strip(q.trim()); r = r.filter(x => strip(x.question).includes(s) || strip(x.corrected_q || "").includes(s)); }
    return r;
  }, [rows, filter, q]);

  const doPromote = async (row, val) => {
    setBusy(row.id);
    const ok = await setPromoted(row.id, val);
    setBusy(null);
    if (ok) { setRows(rs => rs.map(x => x.id === row.id ? { ...x, promoted: val } : x)); showToast && showToast(val ? "Đã thăng cấp thành mẫu chính thức" : "Đã bỏ thăng cấp"); }
    else showToast && showToast("Không cập nhật được — kiểm tra bảng chat_learning", "error");
  };
  const doDelete = async (row) => {
    if (!window.confirm("Xoá mẫu học này? Trợ lý sẽ không dùng nó nữa.")) return;
    setBusy(row.id);
    const ok = await deleteLearning(row.id);
    setBusy(null);
    if (ok) setRows(rs => rs.filter(x => x.id !== row.id));
    else showToast && showToast("Không xoá được", "error");
  };

  const chip = (id, label, n) => (
    <button onClick={() => setFilter(id)} style={{ fontSize: 12.5, padding: "5px 12px", borderRadius: 20, border: "1px solid " + (filter === id ? "#4f46e5" : "#e5e7eb"), background: filter === id ? "#4f46e5" : "#fff", color: filter === id ? "#fff" : "#374151", cursor: "pointer", fontWeight: filter === id ? 600 : 400 }}>{label}{n != null ? ` (${n})` : ""}</button>
  );
  const stat = (label, val, col) => (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 14, flex: 1, minWidth: 90 }}>
      <div style={{ fontSize: 11, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: col }}>{val}</div>
    </div>
  );
  const fbBadge = r => r.corrected_q
    ? <span style={{ fontSize: 10.5, background: "#ede9fe", color: "#6d28d9", padding: "1px 7px", borderRadius: 10, fontWeight: 600 }}>Đã dạy lại</span>
    : r.feedback === 1 ? <span style={{ fontSize: 10.5, background: "#dcfce7", color: "#15803d", padding: "1px 7px", borderRadius: 10, fontWeight: 600 }}>👍 Hữu ích</span>
    : r.feedback === -1 ? <span style={{ fontSize: 10.5, background: "#fee2e2", color: "#b91c1c", padding: "1px 7px", borderRadius: 10, fontWeight: 600 }}>👎 Chưa đạt</span>
    : <span style={{ fontSize: 10.5, color: "#9ca3af" }}>—</span>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "linear-gradient(135deg,#6d28d9,#7c3aed)", borderRadius: 12, padding: isMobile ? 16 : "18px 24px", color: "#fff" }}>
        <div style={{ fontSize: isMobile ? 17 : 19, fontWeight: 700 }}>🧠 Trợ lý học — Xem & duyệt</div>
        <div style={{ fontSize: 12.5, opacity: 0.9, marginTop: 3 }}>Những gì trợ lý chat đã học từ phản hồi người dùng. Thăng cấp ⭐ câu tốt để trợ lý ưu tiên dùng.</div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {stat("Tổng mẫu", stats.total, "#4f46e5")}
        {stat("👍 Hữu ích", stats.up, "#15803d")}
        {stat("👎 Chưa đạt", stats.down, "#b91c1c")}
        {stat("Đã dạy lại", stats.taught, "#6d28d9")}
        {stat("⭐ Thăng cấp", stats.promoted, "#b45309")}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {chip("taught", "Đã dạy lại", stats.taught)}
        {chip("promoted", "⭐ Thăng cấp", stats.promoted)}
        {chip("up", "👍 Hữu ích", stats.up)}
        {chip("down", "👎 Chưa đạt", null)}
        {chip("all", "Tất cả", stats.total)}
        <button onClick={load} style={{ fontSize: 12, color: "#4f46e5", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", marginLeft: "auto" }}>↻ Tải lại</button>
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 Tìm trong câu hỏi / câu đã dạy lại…" style={{ padding: "9px 13px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 13, width: "100%", boxSizing: "border-box" }} />

      {err && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>⚠️ Chưa đọc được bảng <b>chat_learning</b> ({err}). Hãy chạy tệp <b>supabase/37-tao-bang-chat-hoc.sql</b> trong Supabase.</div>}
      {loading && <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Đang tải…</div>}
      {!loading && filtered.length === 0 && !err && <div style={{ padding: 30, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Chưa có mẫu học nào trong nhóm này.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(r => (
          <div key={r.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid " + (r.promoted ? "#fcd34d" : "#e5e7eb"), padding: "11px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 3 }}>
                {fbBadge(r)}
                {r.promoted && <span style={{ fontSize: 10.5, background: "#fef3c7", color: "#b45309", padding: "1px 7px", borderRadius: 10, fontWeight: 600 }}>⭐ Chính thức</span>}
                <span style={{ fontSize: 10.5, color: "#9ca3af" }}>{r.username || "—"} · {fmt(r.created_at)}</span>
              </div>
              <div style={{ fontSize: 13.5, color: "#374151", wordBreak: "break-word" }}>"{r.question}"</div>
              {r.corrected_q && <div style={{ fontSize: 12.5, color: "#6d28d9", marginTop: 2, wordBreak: "break-word" }}>↳ hiểu là: <b>"{r.corrected_q}"</b></div>}
            </div>
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 6, flexShrink: 0 }}>
              <button disabled={busy === r.id} onClick={() => doPromote(r, !r.promoted)} style={{ fontSize: 11.5, padding: "5px 10px", borderRadius: 8, border: "1px solid " + (r.promoted ? "#fcd34d" : "#c7d2fe"), background: r.promoted ? "#fffbeb" : "#eef2ff", color: r.promoted ? "#b45309" : "#4338ca", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>{r.promoted ? "★ Bỏ thăng cấp" : "⭐ Thăng cấp"}</button>
              <button disabled={busy === r.id} onClick={() => doDelete(r)} title="Xoá mẫu học" style={{ fontSize: 11.5, padding: "5px 10px", borderRadius: 8, border: "1px solid #fecaca", background: "#fff0f0", color: "#dc2626", cursor: "pointer" }}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
