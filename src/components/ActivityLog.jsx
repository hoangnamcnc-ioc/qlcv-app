import React, { useState, useMemo } from "react";

// Nhật ký hoạt động TOÀN DIỆN: gộp sự kiện từ Nhiệm vụ + Hỗ trợ ND + Ngân sách + Nhiệm vụ khác,
// có tìm kiếm, lọc theo người/loại/khoảng ngày, phân trang và xuất CSV.
const MODULES = { task: { label: "Nhiệm vụ", icon: "📋", col: "#4338ca" }, support: { label: "Hỗ trợ ND", icon: "🎧", col: "#0369a1" }, project: { label: "Ngân sách", icon: "💰", col: "#92400e" }, other: { label: "Nhiệm vụ khác", icon: "📌", col: "#7c3aed" }, document: { label: "Văn bản", icon: "📁", col: "#0f766e" } };
const PAGE = 50;

export default function ActivityLog({ log, isMobile }) {
  const [search, setSearch] = useState("");
  const [person, setPerson] = useState("all");
  const [mod, setMod] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const persons = useMemo(() => [...new Set((log || []).map(l => l.by).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [log]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromT = from ? new Date(from + "T00:00:00").getTime() : null;
    const toT = to ? new Date(to + "T23:59:59").getTime() : null;
    return (log || []).filter(l => {
      if (person !== "all" && l.by !== person) return false;
      if (mod !== "all" && l.module !== mod) return false;
      if (fromT || toT) { const t = l.ts ? l.ts.getTime() : null; if (t == null) return false; if (fromT && t < fromT) return false; if (toT && t > toT) return false; }
      if (q) { const hay = `${l.by || ""} ${l.action || ""} ${l.title || ""}`.toLowerCase(); if (!hay.includes(q)) return false; }
      return true;
    });
  }, [log, search, person, mod, from, to]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * PAGE, pageSafe * PAGE);
  const reset = () => setPage(1);

  const exportCSV = () => {
    const header = ["Thời gian", "Người thực hiện", "Hành động", "Đối tượng", "Loại"];
    const lines = filtered.map(l => [`"${(l.at || "").replace(/"/g, '""')}"`, `"${(l.by || "").replace(/"/g, '""')}"`, `"${(l.action || "").replace(/"/g, '""')}"`, `"${(l.title || "").replace(/"/g, '""')}"`, MODULES[l.module]?.label || l.module].join(","));
    const csv = "﻿" + [header.join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = `nhat-ky-hoat-dong.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const selStyle = { padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 12, background: "#fff" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginRight: 4 }}>📜 Nhật ký hoạt động</span>
        <input value={search} onChange={e => { setSearch(e.target.value); reset(); }} placeholder="🔍 Tìm người / hành động / đối tượng…" style={{ ...selStyle, flex: isMobile ? "1 1 100%" : "1 1 220px", minWidth: 160 }} />
        <select value={person} onChange={e => { setPerson(e.target.value); reset(); }} style={selStyle}><option value="all">Mọi người</option>{persons.map(p => <option key={p} value={p}>{p}</option>)}</select>
        <select value={mod} onChange={e => { setMod(e.target.value); reset(); }} style={selStyle}><option value="all">Mọi loại</option>{Object.entries(MODULES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}</select>
        <input type="date" value={from} onChange={e => { setFrom(e.target.value); reset(); }} title="Từ ngày" style={selStyle} />
        <input type="date" value={to} onChange={e => { setTo(e.target.value); reset(); }} title="Đến ngày" style={selStyle} />
        {(search || person !== "all" || mod !== "all" || from || to) && <button onClick={() => { setSearch(""); setPerson("all"); setMod("all"); setFrom(""); setTo(""); reset(); }} style={{ ...selStyle, cursor: "pointer", color: "#6b7280" }}>✕ Bỏ lọc</button>}
        <button onClick={exportCSV} style={{ ...selStyle, cursor: "pointer", color: "#15803d", borderColor: "#86efac", background: "#f0fdf4", fontWeight: 600 }}>⬇ CSV</button>
      </div>

      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "8px 16px", fontSize: 12, color: "#6b7280", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <span>Tìm thấy <b style={{ color: "#374151" }}>{filtered.length}</b> thao tác{filtered.length !== (log || []).length ? ` (trên tổng ${(log || []).length})` : ""}</span>
        <span>Gộp từ: Nhiệm vụ · Hỗ trợ ND · Ngân sách · Nhiệm vụ khác · Văn bản</span>
      </div>

      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        {paged.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Không có hoạt động phù hợp</div> : paged.map(l => {
          const m = MODULES[l.module] || { label: l.module, icon: "•", col: "#6b7280" };
          return (
            <div key={l.id} style={{ padding: "10px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: m.col + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14 }}>{m.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13 }}><span style={{ fontWeight: 600, color: "#4338ca" }}>{l.by || "—"}</span> <span style={{ color: "#374151" }}>{l.action}</span></div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, whiteSpace: "normal", wordBreak: "break-word", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ background: m.col + "14", color: m.col, padding: "1px 7px", borderRadius: 6, fontWeight: 600 }}>{m.label}</span>
                  <span>{l.title}</span>
                  <span>· {l.at || "—"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageSafe <= 1} style={{ padding: "5px 12px", border: "1px solid #d1d5db", borderRadius: 7, background: pageSafe <= 1 ? "#f3f4f6" : "#fff", color: pageSafe <= 1 ? "#d1d5db" : "#374151", cursor: pageSafe <= 1 ? "default" : "pointer", fontSize: 13 }}>‹ Trước</button>
          <span style={{ fontSize: 13, color: "#6b7280" }}>Trang {pageSafe}/{totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={pageSafe >= totalPages} style={{ padding: "5px 12px", border: "1px solid #d1d5db", borderRadius: 7, background: pageSafe >= totalPages ? "#f3f4f6" : "#fff", color: pageSafe >= totalPages ? "#d1d5db" : "#374151", cursor: pageSafe >= totalPages ? "default" : "pointer", fontSize: 13 }}>Sau ›</button>
        </div>
      )}
    </div>
  );
}
