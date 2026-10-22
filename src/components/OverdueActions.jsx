import React, { useState } from "react";
import { LATE_REASONS, deptLabel } from "../constants";
import { fmtDate } from "../helpers";
import { daysLate, NUDGE_AFTER_DAYS, ESCALATE_AFTER_DAYS } from "../taskNudge";

// Khối xử lý VIỆC QUÁ HẠN trong Tổng quan:
//  • "mine": việc CỦA TÔI trễ ≥ 3 ngày → 3 lựa chọn 1 chạm: ✅ Đã xong / 📅 Xin gia hạn / chọn lý do trễ.
//  • "escalated": (Trưởng/Phó phòng, BGĐ phụ trách) việc trong phòng trễ ≥ 14 ngày → xem + nhắc người thực hiện.
const LIMIT = 5;
const btn = (bg, col, bd) => ({ padding: "4px 10px", border: "1px solid " + bd, borderRadius: 6, background: bg, color: col, cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" });

export default function OverdueActions({ mine = [], escalated = [], myEid, todayStr, isMobile, getEmp, onDone, onExtend, onReason, onOpen, onNudge, showMine = true }) {
  const [allMine, setAllMine] = useState(false);
  const [allEsc, setAllEsc] = useState(false);
  const mineRows = allMine ? mine : mine.slice(0, LIMIT);
  const escRows = allEsc ? escalated : escalated.slice(0, LIMIT);
  if ((!showMine || mine.length === 0) && escalated.length === 0) return null;

  return (
    <>
      {showMine && mine.length > 0 && (
        <div style={{ order: -5, background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#9a3412" }}>⏰ Việc quá hạn cần bạn cập nhật ({mine.length})</div>
          <div style={{ fontSize: 12, color: "#9a3412", opacity: 0.85, margin: "2px 0 10px" }}>Đã trễ từ {NUDGE_AFTER_DAYS} ngày trở lên — cho biết tình trạng để mọi người nắm: đã xong rồi, cần gia hạn, hay vướng lý do gì.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {mineRows.map(t => {
              const late = daysLate(t.deadline, todayStr);
              const reason = LATE_REASONS.find(r => r.value === t.late_reason);
              const canExtend = t.eid === myEid && !t.ext_proposed;
              return (
                <div key={t.id} style={{ background: "#fff", border: "1px solid #fed7aa", borderRadius: 8, padding: "10px 12px" }}>
                  <div onClick={() => onOpen(t)} style={{ cursor: "pointer", fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{t.title}</div>
                  <div style={{ fontSize: 11.5, color: "#b91c1c", marginBottom: 8 }}>Hạn {fmtDate(t.deadline)} · <b>trễ {late} ngày</b>{t.ext_proposed ? " · đã gửi đề xuất gia hạn" : ""}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <button onClick={() => onDone(t)} style={btn("#f0fdf4", "#15803d", "#86efac")}>✅ Đã xong rồi</button>
                    {canExtend && <button onClick={() => onExtend(t)} style={btn("#eff6ff", "#1d4ed8", "#93c5fd")}>📅 Xin gia hạn</button>}
                    {reason
                      ? <span style={{ fontSize: 12, background: "#fef3c7", color: "#92400e", padding: "3px 9px", borderRadius: 6 }}>Lý do trễ: {reason.label}</span>
                      : <select defaultValue="" onChange={e => { if (e.target.value) onReason(t.id, e.target.value); }} style={{ padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, background: "#fff" }}>
                          <option value="">Chọn lý do trễ…</option>
                          {LATE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>}
                  </div>
                </div>
              );
            })}
          </div>
          {mine.length > LIMIT && <button onClick={() => setAllMine(v => !v)} style={{ marginTop: 8, background: "none", border: "none", color: "#9a3412", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{allMine ? "Thu gọn ▲" : `Xem tất cả ${mine.length} việc ▼`}</button>}
        </div>
      )}

      {escalated.length > 0 && (
        <div style={{ order: -4, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#991b1b" }}>🚨 Việc trễ quá {ESCALATE_AFTER_DAYS} ngày trong phòng ({escalated.length})</div>
          <div style={{ fontSize: 12, color: "#991b1b", opacity: 0.85, margin: "2px 0 10px" }}>Cần Trưởng/Phó phòng xem xét: nhắc người thực hiện, gia hạn hoặc điều chỉnh.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {escRows.map(t => (
              <div key={t.id} style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div onClick={() => onOpen(t)} style={{ cursor: "pointer", fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isMobile ? "normal" : "nowrap" }}>{t.title}</div>
                  <div style={{ fontSize: 11.5, color: "#6b7280" }}>{getEmp(t.eid)?.name || "—"} · {deptLabel(t.dept)} · hạn {fmtDate(t.deadline)} · <b style={{ color: "#b91c1c" }}>trễ {daysLate(t.deadline, todayStr)} ngày</b>{t.nudge_count ? ` · đã nhắc ${t.nudge_count} lần` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => onNudge(t)} style={btn("#fff7ed", "#c2410c", "#fdba74")}>🔔 Nhắc</button>
                  <button onClick={() => onOpen(t)} style={btn("#f9fafb", "#374151", "#d1d5db")}>Mở</button>
                </div>
              </div>
            ))}
          </div>
          {escalated.length > LIMIT && <button onClick={() => setAllEsc(v => !v)} style={{ marginTop: 8, background: "none", border: "none", color: "#991b1b", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{allEsc ? "Thu gọn ▲" : `Xem tất cả ${escalated.length} việc ▼`}</button>}
        </div>
      )}
    </>
  );
}
