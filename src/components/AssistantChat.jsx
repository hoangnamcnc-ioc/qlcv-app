import React, { useState, useRef, useEffect } from "react";

// Trợ lý tra cứu bằng THUẬT TOÁN (không dùng AI ngoài): nhận diện ý định theo từ khoá rồi trả lời từ số liệu.
// Phạm vi dữ liệu theo quyền xem của người hỏi (computed đã lọc theo vai trò).
const VI_MONTHS = ["tháng 1","tháng 2","tháng 3","tháng 4","tháng 5","tháng 6","tháng 7","tháng 8","tháng 9","tháng 10","tháng 11","tháng 12"];
const SUGGESTIONS = [
  "Tháng này ai nhiều việc nhất?",
  "Ai ít việc nhất?",
  "Ai làm nhanh nhất?",
  "Ai trễ hạn nhiều nhất?",
  "Ai đúng hạn cao nhất?",
  "Ai điểm cao nhất tháng này?",
  "Ai đang quá tải?",
  "Ai đang rảnh nhất?",
  "Phòng nào tốt nhất?",
];

export default function AssistantChat({ employees, computed, calcMonthPerf, empReliability, activeLoadByEid, getEmp, isCompletedStatus }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ who: "bot", text: "Chào bạn! Hỏi tôi về công việc theo số liệu, ví dụ bấm một câu gợi ý bên dưới hoặc gõ câu hỏi.", list: [] }]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);
  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  const today = new Date();
  const nm = id => getEmp(id)?.name || "—";
  const parseMonth = q => { const m = q.match(/th[aá]ng\s*(\d{1,2})/); if (m) return Math.min(11, Math.max(0, +m[1] - 1)); if (/th[aá]ng n[aà]y|hi[eệ]n t[aạ]i/.test(q)) return today.getMonth(); return null; };
  const monthLabel = mi => `${VI_MONTHS[mi]}/${today.getFullYear()}`;

  // Đếm việc theo người (lọc theo tháng nếu có)
  const countTasks = mi => { const y = today.getFullYear(); const map = {}; for (const t of computed) { if (!t.eid) continue; if (mi != null) { const d = new Date(t.deadline); if (isNaN(d) || d.getFullYear() !== y || d.getMonth() !== mi) continue; } map[t.eid] = (map[t.eid] || 0) + 1; } return map; };
  const countLate = mi => { const y = today.getFullYear(); const map = {}; for (const t of computed) { if (!t.eid) continue; if (!(t.status === "completed_late" || t.status === "overdue")) continue; if (mi != null) { const d = new Date(t.deadline); if (isNaN(d) || d.getFullYear() !== y || d.getMonth() !== mi) continue; } map[t.eid] = (map[t.eid] || 0) + 1; } return map; };
  const rank = (map, dir = "desc") => Object.entries(map).sort((a, b) => dir === "desc" ? b[1] - a[1] : a[1] - b[1]);
  const topList = (arr, fmt, n = 5) => arr.slice(0, n).map(([id, v], i) => `${i + 1}. ${nm(id)} — ${fmt(v)}`);

  const answer = (raw) => {
    const q = raw.toLowerCase().trim();
    const mi = parseMonth(q);
    const scope = mi != null ? ` (${monthLabel(mi)})` : "";
    // Điểm hiệu suất
    if (/(đi[eể]m|hi[eệ]u su[aấ]t|x[eế]p h[aạ]ng)/.test(q)) {
      const useMi = mi != null ? mi : today.getMonth();
      const rows = (employees || []).filter(e => !e.no_kpi).map(e => ({ e, m: calcMonthPerf(e.id, today.getFullYear(), useMi) })).filter(x => x.m.resolved > 0);
      const asc = /th[aấ]p|k[eé]m|y[eế]u/.test(q);
      rows.sort((a, b) => asc ? a.m.perfScore - b.m.perfScore : b.m.perfScore - a.m.perfScore);
      if (!rows.length) return { text: `Chưa có ai đủ dữ liệu chấm điểm ${monthLabel(useMi)}.`, list: [] };
      return { text: `Điểm hiệu suất ${monthLabel(useMi)} (${asc ? "thấp → cao" : "cao → thấp"}):`, list: rows.slice(0, 5).map((x, i) => `${i + 1}. ${x.e.name} — ${x.m.perfScore}đ${x.m.eligible ? "" : " (tham khảo)"}`) };
    }
    // Trễ hạn nhiều nhất
    if (/(tr[eễ]|qu[aá] h[aạ]n)/.test(q)) {
      const r = rank(countLate(mi));
      if (!r.length) return { text: `Không có việc trễ/quá hạn nào${scope}. 👍`, list: [] };
      return { text: `Người có nhiều việc trễ/quá hạn nhất${scope}:`, list: topList(r, v => `${v} việc trễ`) };
    }
    // Đúng hạn cao nhất
    if (/(đ[uú]ng h[aạ]n|tin c[aậ]y)/.test(q)) {
      const r = Object.entries(empReliability || {}).filter(([id, v]) => v.onTimeRate != null && v.resolved >= 3 && !getEmp(id)?.no_kpi).sort((a, b) => b[1].onTimeRate - a[1].onTimeRate);
      if (!r.length) return { text: "Chưa đủ dữ liệu lịch sử để xếp hạng đúng hạn.", list: [] };
      return { text: "Đúng hạn cao nhất (theo lịch sử, ≥3 việc):", list: r.slice(0, 5).map(([id, v], i) => `${i + 1}. ${nm(id)} — ${v.onTimeRate}% (${v.resolved} việc)`) };
    }
    // Nhanh nhất
    if (/(nhanh|s[oớ]m|t[oố]c đ[oộ])/.test(q)) {
      const r = Object.entries(empReliability || {}).filter(([id, v]) => v.avgDays != null && v.resolved >= 3 && !getEmp(id)?.no_kpi).sort((a, b) => a[1].avgDays - b[1].avgDays);
      if (!r.length) return { text: "Chưa đủ dữ liệu để tính tốc độ hoàn thành.", list: [] };
      return { text: "Hoàn thành nhanh nhất (thời gian TB/việc):", list: r.slice(0, 5).map(([id, v], i) => `${i + 1}. ${nm(id)} — ~${v.avgDays} ngày/việc`) };
    }
    // Quá tải / rảnh
    if (/(qu[aá] t[aả]i|nhi[eề]u vi[eệ]c nh[aấ]t đang|b[aậ]n nh[aấ]t)/.test(q) && /(qu[aá] t[aả]i|b[aậ]n|đang)/.test(q) && mi == null) {
      const r = Object.entries(activeLoadByEid || {}).sort((a, b) => b[1].w - a[1].w);
      if (!r.length) return { text: "Hiện không ai có việc đang mở.", list: [] };
      return { text: "Đang gánh nhiều việc mở nhất (quy đổi):", list: r.slice(0, 5).map(([id, v], i) => `${i + 1}. ${nm(id)} — ${v.count} việc (≈${v.w} quy đổi)`) };
    }
    if (/(r[aả]nh|[ií]t vi[eệ]c nh[aấ]t đang|nh[aà]n)/.test(q) && mi == null && /(r[aả]nh|nh[aà]n|[ií]t)/.test(q)) {
      const withLoad = new Set(Object.keys(activeLoadByEid || {}));
      const free = (employees || []).filter(e => !e.no_kpi && !withLoad.has(e.id));
      if (free.length) return { text: "Đang rảnh (không có việc mở nào):", list: free.slice(0, 6).map((e, i) => `${i + 1}. ${e.name} (${e.dept})`) };
      const r = Object.entries(activeLoadByEid || {}).sort((a, b) => a[1].w - b[1].w);
      return { text: "Ít việc mở nhất (quy đổi):", list: r.slice(0, 5).map(([id, v], i) => `${i + 1}. ${nm(id)} — ${v.count} việc (≈${v.w} quy đổi)`) };
    }
    // Phòng nào tốt/kém nhất
    if (/ph[oò]ng n[aà]o|ph[oò]ng.*(t[oố]t|k[eé]m|cao|th[aấ]p)/.test(q)) {
      const y = today.getFullYear(); const byDept = {};
      for (const t of computed) { const d = t.dept; if (!d) continue; if (mi != null) { const dd = new Date(t.deadline); if (isNaN(dd) || dd.getFullYear() !== y || dd.getMonth() !== mi) continue; } if (!byDept[d]) byDept[d] = { total: 0, done: 0 }; byDept[d].total++; if (isCompletedStatus(t.status)) byDept[d].done++; }
      const rows = Object.entries(byDept).map(([d, v]) => ({ d, rate: v.total ? Math.round(v.done / v.total * 100) : 0, total: v.total }));
      if (!rows.length) return { text: `Chưa có dữ liệu phòng ban${scope}.`, list: [] };
      const asc = /k[eé]m|th[aấ]p|y[eế]u/.test(q);
      rows.sort((a, b) => asc ? a.rate - b.rate : b.rate - a.rate);
      return { text: `Tỷ lệ hoàn thành theo phòng${scope} (${asc ? "thấp → cao" : "cao → thấp"}):`, list: rows.map((r, i) => `${i + 1}. ${r.d} — ${r.rate}% (${r.total} việc)`) };
    }
    // Ít việc nhất
    if (/[ií]t.*vi[eệ]c|vi[eệ]c.*[ií]t nh[aấ]t/.test(q)) {
      const r = rank(countTasks(mi), "asc");
      if (!r.length) return { text: `Không có dữ liệu việc${scope}.`, list: [] };
      return { text: `Người ít việc nhất${scope || " (toàn bộ việc đang thấy)"}:`, list: topList(r, v => `${v} việc`) };
    }
    // Nhiều việc nhất (mặc định khi hỏi "ai nhiều việc")
    if (/nhi[eề]u.*vi[eệ]c|vi[eệ]c.*nhi[eề]u nh[aấ]t|ai.*vi[eệ]c/.test(q)) {
      const r = rank(countTasks(mi), "desc");
      if (!r.length) return { text: `Không có dữ liệu việc${scope}.`, list: [] };
      return { text: `Người nhiều việc nhất${scope || " (toàn bộ việc đang thấy)"}:`, list: topList(r, v => `${v} việc`) };
    }
    return { text: "Tôi chưa hiểu câu hỏi. Bạn thử bấm một câu gợi ý, hoặc hỏi về: nhiều/ít việc, làm nhanh, trễ hạn, đúng hạn, điểm, quá tải/rảnh, phòng nào tốt nhất (có thể thêm \"tháng N\").", list: [] };
  };

  const send = (text) => {
    const q = (text ?? input).trim(); if (!q) return;
    const a = answer(q);
    setMsgs(m => [...m, { who: "me", text: q }, { who: "bot", ...a }]);
    setInput("");
  };

  return (
    <>
      <button onClick={() => setOpen(o => !o)} title="Trợ lý tra cứu" style={{ position: "fixed", right: 20, bottom: 20, zIndex: 200, width: 56, height: 56, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff", fontSize: 26, cursor: "pointer", boxShadow: "0 6px 20px rgba(79,70,229,0.45)" }}>{open ? "✕" : "💬"}</button>
      {open && (
        <div style={{ position: "fixed", right: 20, bottom: 86, zIndex: 200, width: "min(380px, calc(100vw - 40px))", height: "min(560px, calc(100vh - 120px))", background: "#fff", borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid #e5e7eb" }}>
          <div style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff", padding: "12px 16px" }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>🤖 Trợ lý tra cứu</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>Trả lời từ số liệu công việc (theo quyền xem của bạn)</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10, background: "#f8fafc" }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.who === "me" ? "flex-end" : "flex-start", maxWidth: "85%", background: m.who === "me" ? "#4f46e5" : "#fff", color: m.who === "me" ? "#fff" : "#374151", border: m.who === "me" ? "none" : "1px solid #e5e7eb", borderRadius: 12, padding: "8px 12px", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {m.text}
                {m.list && m.list.length > 0 && <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>{m.list.map((li, li2) => <div key={li2} style={{ fontSize: 12.5 }}>{li}</div>)}</div>}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          {msgs.length <= 1 && (
            <div style={{ padding: "6px 10px", display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid #f3f4f6", maxHeight: 120, overflowY: "auto" }}>
              {SUGGESTIONS.map(s => <button key={s} onClick={() => send(s)} style={{ fontSize: 11.5, background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe", borderRadius: 14, padding: "4px 10px", cursor: "pointer" }}>{s}</button>)}
            </div>
          )}
          <div style={{ padding: 10, borderTop: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }} placeholder="Hỏi về công việc…" style={{ flex: 1, padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 13 }} />
            <button onClick={() => send()} style={{ background: "#4f46e5", color: "#fff", border: "none", borderRadius: 10, padding: "0 16px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Gửi</button>
          </div>
        </div>
      )}
    </>
  );
}
