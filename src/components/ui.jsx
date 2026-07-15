import React from "react";
import { ROLE_COLORS, ROLE_LABELS, RATING, STATUS, STATUS_ORDER, PRIO } from "../constants";
import { isCompletedStatus, fmtDate } from "../helpers";

// Nhãn trạng thái nhiệm vụ (chấm màu + tên) — dùng chung toàn app
export const Chip = ({ s }) => (
  <span style={{ background: STATUS[s].bg, color: STATUS[s].col, fontSize: 12, padding: "2px 8px", borderRadius: 12, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS[s].dot, flexShrink: 0 }} />{STATUS[s].label}
  </span>
);

// Nhãn mức ưu tiên
export const PChip = ({ p }) => (
  <span style={{ background: PRIO[p].bg, color: PRIO[p].col, fontSize: 12, padding: "2px 8px", borderRadius: 12 }}>{PRIO[p].label}</span>
);

export const ProgressBar = ({ value, onChange, editable = false }) => (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
      <span style={{ fontSize: 12, color: "#6b7280" }}>Tiến độ</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: value === 100 ? "#15803d" : value >= 50 ? "#92400e" : "#1e40af" }}>{value}%</span>
    </div>
    <div style={{ height: 8, background: "#e5e7eb", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ height: "100%", width: value + "%", background: value === 100 ? "#16a34a" : value >= 50 ? "#f59e0b" : "#6366f1", borderRadius: 8, transition: "width 0.3s" }} />
    </div>
    {editable && <input type="range" min={0} max={100} step={5} value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: "100%", marginTop: 6, accentColor: "#4f46e5" }} />}
  </div>
);

export const RoleBadge = ({ role }) => {
  const [col, bg] = ROLE_COLORS[role] || ["#475569", "#f1f5f9"];
  return <span style={{ fontSize: 11, color: col, background: bg, padding: "2px 8px", borderRadius: 8, whiteSpace: "nowrap" }}>{ROLE_LABELS[role] || role}</span>;
};

export const RatingBadge = ({ r }) =>
  r && RATING[r] ? <span style={{ background: RATING[r].bg, color: RATING[r].col, fontSize: 12, padding: "2px 8px", borderRadius: 12 }}>{RATING[r].icon} {RATING[r].label}</span> : null;

export function OverloadPopup({ emp, computed, onClose, onOpen, isMobile }) {
  if (!emp) return null;
  const tasks = computed.filter(t => t.eid === emp.id && !isCompletedStatus(t.status)).sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
  return (
    <div style={{ background: "#fff", borderTop: "1px solid #fca5a5", overflow: "hidden" }}>
      <div style={{ padding: "8px 14px", borderBottom: "1px solid #fca5a5", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff5f5" }}>
        <span style={{ fontWeight: 600, fontSize: 12, color: "#b91c1c" }}>📋 Nhiệm vụ của {emp.name} ({tasks.length})</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#9ca3af" }}>✕</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", maxHeight: 260, overflowY: "auto" }}>
        {tasks.map(t => {
          const sc = STATUS[t.status];
          return (
            <div key={t.id} onClick={() => onOpen(t)} style={{ padding: "9px 12px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = "#fff5f5"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "normal", wordBreak: "break-word" }}>{t.title}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>Hạn: {fmtDate(t.deadline)}</div>
              </div>
              <span style={{ background: sc.bg, color: sc.col, fontSize: 10, padding: "2px 6px", borderRadius: 6, flexShrink: 0 }}>{sc.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
