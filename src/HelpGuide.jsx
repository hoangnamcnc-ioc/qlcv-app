import React, { useState, useMemo } from "react";

// ───── Nội dung hướng dẫn sử dụng ─────
import { GUIDE_SECTIONS as SECTIONS } from "./guideContent";


function Block({ b }) {
  if (b.h) return <div style={{ fontWeight: 700, fontSize: 13.5, color: "#1e1b4b", marginTop: 12, marginBottom: 4 }}>{b.h}</div>;
  if (b.p) return <div style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.6, marginBottom: 8 }}>{b.p}</div>;
  if (b.note) return (
    <div style={{ margin: "8px 0 12px", padding: "8px 12px", background: b.bg || "#fffbeb", borderLeft: "3px solid " + (b.color || "#92400e"), borderRadius: 6, fontSize: 13, color: b.color || "#92400e", fontStyle: "italic" }}>
      💡 {b.note}
    </div>
  );
  if (b.ul) return (
    <ul style={{ margin: "0 0 10px", paddingLeft: 20 }}>
      {b.ul.map((li, i) => <li key={i} style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.6, marginBottom: 3 }}>{li}</li>)}
    </ul>
  );
  if (b.ol) return (
    <ol style={{ margin: "0 0 10px", paddingLeft: 20 }}>
      {b.ol.map((li, i) => <li key={i} style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.6, marginBottom: 4 }}>{li}</li>)}
    </ol>
  );
  if (b.table) return (
    <div style={{ overflowX: "auto", margin: "8px 0 14px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 480 }}>
        <thead><tr style={{ background: "#1e1b4b" }}>{b.table.head.map((h, i) => <th key={i} style={{ padding: "7px 10px", textAlign: "left", color: "#fff", fontWeight: 600 }}>{h}</th>)}</tr></thead>
        <tbody>{b.table.rows.map((r, ri) => (
          <tr key={ri} style={{ background: ri % 2 ? "#f8fafc" : "#fff", borderBottom: "1px solid #f1f5f9" }}>
            {r.map((c, ci) => <td key={ci} style={{ padding: "7px 10px", color: "#374151" }}>{c}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
  return null;
}

export default function HelpGuide({ isMobile }) {
  const [open, setOpen] = useState(() => new Set([0]));
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return SECTIONS.map((s, i) => ({ ...s, i }));
    const query = q.toLowerCase();
    return SECTIONS.map((s, i) => ({ ...s, i })).filter(s =>
      s.title.toLowerCase().includes(query) ||
      JSON.stringify(s.body).toLowerCase().includes(query)
    );
  }, [q]);

  const toggle = i => setOpen(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", borderRadius: 12, padding: isMobile ? "16px" : "20px 24px", color: "#fff" }}>
        <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, marginBottom: 4 }}>📘 Hướng dẫn sử dụng QLCV</div>
        <div style={{ fontSize: 13, opacity: 0.9 }}>Hệ thống Quản lý Giao việc — Trung tâm Giám sát, Điều hành Đô thị thông minh tỉnh Đắk Lắk</div>
      </div>

      <input
        value={q} onChange={e => setQ(e.target.value)}
        placeholder="🔍 Tìm nhanh trong hướng dẫn (VD: yêu cầu hoàn thành, đánh giá, phân quyền...)"
        style={{ padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 13.5, width: "100%", boxSizing: "border-box" }}
      />

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 30, fontSize: 13 }}>Không tìm thấy nội dung phù hợp</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(s => {
          const isOpen = open.has(s.i);
          return (
            <div key={s.i} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <button onClick={() => toggle(s.i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: isOpen ? "#f5f3ff" : "#fff", border: "none", cursor: "pointer", textAlign: "left" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 14, color: "#1e1b4b" }}><span>{s.icon}</span>{s.title}</span>
                <span style={{ color: "#9ca3af", fontSize: 12 }}>{isOpen ? "▲ Thu gọn" : "▼ Xem"}</span>
              </button>
              {isOpen && <div style={{ padding: "6px 16px 16px", borderTop: "1px solid #f3f4f6" }}>{s.body.map((b, bi) => <Block key={bi} b={b} />)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
