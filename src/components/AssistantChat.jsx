import React, { useState, useRef, useEffect } from "react";
import { DEPTS, STATUS } from "../constants";
import { fmtDate } from "../helpers";

// Trợ lý tra cứu bằng THUẬT TOÁN (không dùng AI ngoài). Hiểu: bỏ dấu + từ đồng nghĩa, tên người/phòng,
// mốc thời gian, lọc gộp (phòng + tháng + tiêu chí), so sánh 2 người, và tìm/ tóm tắt tệp. Theo quyền xem.
const strip = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
const has = (qn, ...arr) => arr.some(w => qn.includes(w));
const SUGGESTIONS = [
  "Tháng này ai nhiều việc nhất?",
  "Ai làm nhanh nhất?",
  "Ai trễ nhiều nhất phòng HCTH tháng 7?",
  "So sánh ... với ...",
  "Việc nào sắp trễ?",
  "Phòng nào tốt nhất quý 3?",
  "Tìm việc: báo cáo",
];

export default function AssistantChat({ employees, computed, calcMonthPerf, empReliability, activeLoadByEid, getEmp, isCompletedStatus, onOpenTask, onOpenProfile }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ who: "bot", text: "Chào bạn! Hỏi về một người (\"Nguyễn Văn A tháng này thế nào?\"), so sánh 2 người, lọc theo phòng + tháng (\"ai trễ nhiều nhất phòng HCTH tháng 7?\"), tìm việc theo từ khoá — hoặc bấm 📎 tải tệp lên để tóm tắt." }]);
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(-1);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  const today = new Date();
  const y = today.getFullYear();
  const nm = id => getEmp(id)?.name || "—";

  const parsePeriod = qn => {
    const monthRange = mi => ({ from: new Date(y, mi, 1), to: new Date(y, mi + 1, 0, 23, 59, 59), label: `tháng ${mi + 1}/${y}`, monthIdx: mi });
    let m;
    if ((m = qn.match(/thang\s*(\d{1,2})/))) return monthRange(Math.min(11, Math.max(0, +m[1] - 1)));
    if ((m = qn.match(/quy\s*([1-4])/))) { const q = +m[1], s = (q - 1) * 3; return { from: new Date(y, s, 1), to: new Date(y, s + 3, 0, 23, 59, 59), label: `quý ${q}/${y}` }; }
    if (/hom nay/.test(qn)) { const d = new Date(today); d.setHours(0, 0, 0, 0); const e = new Date(today); e.setHours(23, 59, 59, 999); return { from: d, to: e, label: "hôm nay" }; }
    if (/tuan nay/.test(qn)) { const d = new Date(today); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); d.setHours(0, 0, 0, 0); const e = new Date(d); e.setDate(e.getDate() + 6); e.setHours(23, 59, 59, 999); return { from: d, to: e, label: "tuần này" }; }
    if (/thang nay|hien tai/.test(qn)) return monthRange(today.getMonth());
    if ((m = qn.match(/(\d+)\s*ngay/))) { const d = new Date(today); d.setDate(d.getDate() - +m[1]); return { from: d, to: new Date(today), label: `${m[1]} ngày qua` }; }
    if (/nam nay/.test(qn)) return { from: new Date(y, 0, 1), to: new Date(y, 11, 31, 23, 59, 59), label: `năm ${y}` };
    return null;
  };
  const findPersons = qn => { const out = []; const seen = new Set(); const cand = []; for (const e of (employees || [])) { const en = strip(e.name); if (qn.includes(en)) cand.push({ e, len: en.length, at: qn.indexOf(en) }); else { const last = en.split(" ").slice(-2).join(" "); if (last.length >= 5 && qn.includes(last)) cand.push({ e, len: last.length, at: qn.indexOf(last) }); } } cand.sort((a, b) => b.len - a.len); for (const c of cand) { if (!seen.has(c.e.id)) { seen.add(c.e.id); out.push(c); } } return out.sort((a, b) => a.at - b.at).map(c => c.e); };
  const findDept = qn => (DEPTS || []).find(d => qn.includes(strip(d)));

  const rankMap = (map, dir = "desc") => Object.entries(map).sort((a, b) => dir === "desc" ? b[1] - a[1] : a[1] - b[1]);
  const topList = (arr, fmt, n = 5) => arr.slice(0, n).map(([id, v], i) => `${i + 1}. ${nm(id)} — ${fmt(v)}`);

  const personStats = (person, period) => {
    const inP = t => { if (!period) return true; const d = new Date(t.deadline); return !isNaN(d) && d >= period.from && d <= period.to; };
    const mi = period?.monthIdx ?? today.getMonth();
    const inScope = computed.filter(t => t.eid === person.id && inP(t));
    const late = inScope.filter(t => t.status === "completed_late" || t.status === "overdue").length;
    const openN = computed.filter(t => t.eid === person.id && !isCompletedStatus(t.status)).length;
    const rel = empReliability[person.id]; const load = activeLoadByEid[person.id]; const m = calcMonthPerf(person.id, y, mi);
    return { total: inScope.length, late, openN, loadW: load ? load.w : 0, onTime: rel?.onTimeRate, avgDays: rel?.avgDays, score: m.resolved > 0 ? m.perfScore : null, eligible: m.eligible, mi };
  };

  const answer = (raw) => {
    const qn = strip(raw);
    const period = parsePeriod(qn);
    const dept = findDept(qn);
    const inPeriod = t => { if (!period) return true; const d = new Date(t.deadline); return !isNaN(d) && d >= period.from && d <= period.to; };
    const deptOk = t => !dept || t.dept === dept;
    const relDeptOk = id => !dept || getEmp(id)?.dept === dept;
    const both = t => inPeriod(t) && deptOk(t);
    const scopeLbl = [dept ? `phòng ${dept}` : "", period ? period.label : ""].filter(Boolean).join(", ");
    const scope = scopeLbl ? ` (${scopeLbl})` : "";

    // 1) TÌM NHIỆM VỤ theo từ khoá
    const wantSearch = has(qn, "tim viec", "tim nhiem vu", "tra cuu", "co viec nao", "viec ve", "nhiem vu ve", "cong viec ve", "tim ");
    const doSearch = () => {
      const stop = new Set(["tim", "kiem", "tra", "cuu", "viec", "cong", "nhiem", "vu", "co", "nao", "ve", "cua", "la", "gi", "cho", "toi", "ai", "o", "va", "the", "nhat", "trong", "danh", "sach", "cac", "nhung", "hay", "giup", "xem", "lien", "quan", "den"]);
      const toks = qn.split(/[^a-z0-9]+/).filter(w => w.length >= 2 && !stop.has(w));
      if (!toks.length) return null;
      const res = computed.map(t => { const hay = strip((t.title || "") + " " + (t.description || "")); return { t, hits: toks.filter(w => hay.includes(w)).length }; }).filter(x => x.hits > 0).sort((a, b) => b.hits - a.hits).slice(0, 7);
      if (!res.length) return null;
      return { text: `🔎 Tìm thấy ${res.length} nhiệm vụ khớp:`, tasks: res.map(x => x.t) };
    };
    if (wantSearch) { const r = doSearch(); if (r) return r; if (has(qn, "tim", "tra cuu")) return { text: "Không tìm thấy nhiệm vụ nào khớp từ khoá đó (trong phạm vi bạn được xem)." }; }

    const persons = findPersons(qn);
    // 2) SO SÁNH 2 người
    if (has(qn, "so sanh", " voi ", " va ") && persons.length >= 2) {
      const [a, b] = persons; const sa = personStats(a, period), sb = personStats(b, period);
      return { text: `⚖️ So sánh${scope}:`, list: [
        `Số việc: ${a.name} ${sa.total} · ${b.name} ${sb.total}`,
        `Trễ/quá hạn: ${a.name} ${sa.late} · ${b.name} ${sb.late}`,
        `Đúng hạn (lịch sử): ${a.name} ${sa.onTime ?? "—"}% · ${b.name} ${sb.onTime ?? "—"}%`,
        `Điểm tháng ${sa.mi + 1}: ${a.name} ${sa.score ?? "—"} · ${b.name} ${sb.score ?? "—"}`,
        `Đang mở: ${a.name} ${sa.openN} · ${b.name} ${sb.openN}`,
      ] };
    }
    // 3) MỘT người
    if (persons.length === 1 && !has(qn, "phong nao")) {
      const p = persons[0], s = personStats(p, period);
      const list = [`Số việc${scope}: ${s.total}${s.late ? ` · trễ/quá hạn: ${s.late}` : ""}`, `Đang mở: ${s.openN} việc${s.loadW ? ` (≈${s.loadW} quy đổi)` : ""}`];
      if (s.onTime != null) list.push(`Đúng hạn (lịch sử): ${s.onTime}%${s.avgDays != null ? ` · TB ~${s.avgDays} ngày/việc` : ""}`);
      if (s.score != null) list.push(`Điểm tháng ${s.mi + 1}: ${s.score}đ${s.eligible ? "" : " (tham khảo)"}`);
      return { text: `👤 ${p.name} — ${p.dept}`, list, profileEid: p.id };
    }

    // 4) Việc sắp trễ
    if (has(qn, "sap tre", "sap het han", "nguy co", "sap qua han")) {
      const dleft = t => { const d = new Date(t.deadline); if (isNaN(d)) return 9999; d.setHours(0, 0, 0, 0); return Math.ceil((d - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000); };
      const res = computed.filter(t => deptOk(t) && !isCompletedStatus(t.status) && !t.completion_requested && t.status !== "overdue" && dleft(t) >= 0 && dleft(t) <= 3 && (t.progress || 0) < 60).sort((a, b) => dleft(a) - dleft(b)).slice(0, 7);
      if (!res.length) return { text: `Không có việc nào sắp trễ${dept ? ` ở phòng ${dept}` : ""}. 👍` };
      return { text: `⚠️ ${res.length} việc sắp trễ${dept ? ` (phòng ${dept})` : ""}:`, tasks: res };
    }
    // 5) Đếm việc quá hạn
    if (has(qn, "bao nhieu", "con may", "tong so", "may viec") && has(qn, "qua han", "tre")) {
      const n = computed.filter(t => t.status === "overdue" && both(t)).length;
      return { text: `Hiện có ${n} việc quá hạn${scope}.` };
    }
    // 6) Điểm
    if (has(qn, "diem", "hieu suat", "xep hang")) {
      const mi = period?.monthIdx ?? today.getMonth();
      const rows = (employees || []).filter(e => !e.no_kpi && (!dept || e.dept === dept)).map(e => ({ e, m: calcMonthPerf(e.id, y, mi) })).filter(x => x.m.resolved > 0);
      if (!rows.length) return { text: `Chưa có ai đủ dữ liệu chấm điểm${scope || ` tháng ${mi + 1}`}.` };
      const asc = has(qn, "thap", "kem", "yeu"); rows.sort((a, b) => asc ? a.m.perfScore - b.m.perfScore : b.m.perfScore - a.m.perfScore);
      return { text: `Điểm${scope || ` tháng ${mi + 1}`} (${asc ? "thấp → cao" : "cao → thấp"}):`, list: rows.slice(0, 5).map((x, i) => `${i + 1}. ${x.e.name} — ${x.m.perfScore}đ${x.m.eligible ? "" : " (tham khảo)"}`) };
    }
    // 7) Trễ nhiều nhất
    if (has(qn, "tre", "qua han", "cham")) {
      const map = {}; for (const t of computed) { if (!t.eid || !both(t)) continue; if (!(t.status === "completed_late" || t.status === "overdue")) continue; map[t.eid] = (map[t.eid] || 0) + 1; }
      const r = rankMap(map); if (!r.length) return { text: `Không có việc trễ/quá hạn nào${scope}. 👍` };
      return { text: `Người có nhiều việc trễ/quá hạn nhất${scope}:`, list: topList(r, v => `${v} việc trễ`) };
    }
    // 8) Đúng hạn cao nhất
    if (has(qn, "dung han", "tin cay", "dung hen")) {
      const r = Object.entries(empReliability || {}).filter(([id, v]) => v.onTimeRate != null && v.resolved >= 3 && !getEmp(id)?.no_kpi && relDeptOk(id)).sort((a, b) => b[1].onTimeRate - a[1].onTimeRate);
      if (!r.length) return { text: "Chưa đủ dữ liệu lịch sử để xếp hạng đúng hạn." };
      return { text: `Đúng hạn cao nhất${dept ? ` (phòng ${dept})` : ""} (lịch sử, ≥3 việc):`, list: r.slice(0, 5).map(([id, v], i) => `${i + 1}. ${nm(id)} — ${v.onTimeRate}% (${v.resolved} việc)`) };
    }
    // 9) Nhanh nhất
    if (has(qn, "nhanh", "som", "toc do")) {
      const r = Object.entries(empReliability || {}).filter(([id, v]) => v.avgDays != null && v.resolved >= 3 && !getEmp(id)?.no_kpi && relDeptOk(id)).sort((a, b) => a[1].avgDays - b[1].avgDays);
      if (!r.length) return { text: "Chưa đủ dữ liệu để tính tốc độ hoàn thành." };
      return { text: `Hoàn thành nhanh nhất${dept ? ` (phòng ${dept})` : ""} (TB/việc):`, list: r.slice(0, 5).map(([id, v], i) => `${i + 1}. ${nm(id)} — ~${v.avgDays} ngày/việc`) };
    }
    // 10) Quá tải
    if (has(qn, "qua tai", "ban nhat", "om nhieu")) {
      const r = Object.entries(activeLoadByEid || {}).filter(([id]) => relDeptOk(id)).sort((a, b) => b[1].w - a[1].w);
      if (!r.length) return { text: "Hiện không ai có việc đang mở." };
      return { text: `Đang gánh nhiều việc mở nhất${dept ? ` (phòng ${dept})` : ""} (quy đổi):`, list: r.slice(0, 5).map(([id, v], i) => `${i + 1}. ${nm(id)} — ${v.count} việc (≈${v.w} quy đổi)`) };
    }
    // 11) Rảnh nhất
    if (has(qn, "ranh", "nhan roi") || (has(qn, "it viec") && has(qn, "dang", "hien"))) {
      const withLoad = new Set(Object.keys(activeLoadByEid || {}));
      const free = (employees || []).filter(e => !e.no_kpi && (!dept || e.dept === dept) && !withLoad.has(e.id));
      if (free.length) return { text: `Đang rảnh${dept ? ` (phòng ${dept})` : ""} (không có việc mở):`, list: free.slice(0, 6).map((e, i) => `${i + 1}. ${e.name} (${e.dept})`) };
      const r = Object.entries(activeLoadByEid || {}).filter(([id]) => relDeptOk(id)).sort((a, b) => a[1].w - b[1].w);
      return { text: "Ít việc mở nhất (quy đổi):", list: r.slice(0, 5).map(([id, v], i) => `${i + 1}. ${nm(id)} — ${v.count} việc (≈${v.w} quy đổi)`) };
    }
    // 12) Phòng nào tốt/kém (so sánh mọi phòng)
    if (has(qn, "phong nao") || (has(qn, "phong") && has(qn, "tot", "kem", "cao", "thap") && !dept)) {
      const byDept = {}; for (const t of computed) { const d = t.dept; if (!d || !inPeriod(t)) continue; if (!byDept[d]) byDept[d] = { total: 0, done: 0 }; byDept[d].total++; if (isCompletedStatus(t.status)) byDept[d].done++; }
      const rows = Object.entries(byDept).map(([d, v]) => ({ d, rate: v.total ? Math.round(v.done / v.total * 100) : 0, total: v.total }));
      if (!rows.length) return { text: `Chưa có dữ liệu phòng ban${period ? ` (${period.label})` : ""}.` };
      const asc = has(qn, "kem", "thap", "yeu"); rows.sort((a, b) => asc ? a.rate - b.rate : b.rate - a.rate);
      return { text: `Tỷ lệ hoàn thành theo phòng${period ? ` (${period.label})` : ""} (${asc ? "thấp → cao" : "cao → thấp"}):`, list: rows.map((r, i) => `${i + 1}. ${r.d} — ${r.rate}% (${r.total} việc)`) };
    }
    // 13) Nhiều/ít việc
    const countTasks = () => { const map = {}; for (const t of computed) { if (!t.eid || !both(t)) continue; map[t.eid] = (map[t.eid] || 0) + 1; } return map; };
    if (has(qn, "it viec", "viec it")) { const r = rankMap(countTasks(), "asc"); if (!r.length) return { text: `Không có dữ liệu việc${scope}.` }; return { text: `Người ít việc nhất${scope}:`, list: topList(r, v => `${v} việc`) }; }
    if (has(qn, "nhieu viec", "viec nhieu", "nhieu nhat", "ai viec")) { const r = rankMap(countTasks(), "desc"); if (!r.length) return { text: `Không có dữ liệu việc${scope}.` }; return { text: `Người nhiều việc nhất${scope}:`, list: topList(r, v => `${v} việc`) }; }

    // 14) Hồ sơ một phòng (khi có tên phòng, không kèm tiêu chí xếp hạng)
    if (dept) {
      const dt = computed.filter(t => t.dept === dept && inPeriod(t));
      const done = dt.filter(t => isCompletedStatus(t.status)).length;
      return { text: `🏢 Phòng ${dept}${period ? ` (${period.label})` : ""}`, list: [`Tổng việc: ${dt.length} · Hoàn thành: ${done} (${dt.length ? Math.round(done / dt.length * 100) : 0}%)`, `Quá hạn: ${dt.filter(t => t.status === "overdue").length} · Đang mở: ${dt.filter(t => !isCompletedStatus(t.status)).length}`] };
    }

    // 15) Fallback: tìm việc; nếu không có thì gợi ý
    const s = doSearch(); if (s) return s;
    return { text: "Mình chưa chắc ý câu hỏi. Thử: tên một người/phòng (+ tháng/quý), \"so sánh A với B\", \"ai trễ nhiều nhất phòng ... tháng ...\", hoặc \"tìm việc <từ khoá>\"." };
  };

  const send = (text) => { const q = (text ?? input).trim(); if (!q) return; setMsgs(m => [...m, { who: "me", text: q }, { who: "bot", ...answer(q) }]); setInput(""); };

  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
    setMsgs(m => [...m, { who: "me", text: `📎 ${f.name}` }, { who: "bot", text: "⏳ Đang đọc & tóm tắt tệp…" }]);
    try {
      const [{ extractFileText }, { extractiveSummary }] = await Promise.all([import("../fileText"), import("../summarize")]);
      const text = await extractFileText(f); const r = extractiveSummary(text);
      const botMsg = r.ok ? { who: "bot", text: `📝 Tóm tắt "${f.name}":`, list: [...r.summarySentences, ...(r.deadlines.length ? ["⏰ Mốc thời gian: " + r.deadlines.join(" · ")] : [])] } : { who: "bot", text: `Không rút được nội dung có ý nghĩa từ "${f.name}" (có thể là PDF scan/ảnh).` };
      setMsgs(m => { const c = [...m]; c[c.length - 1] = botMsg; return c; });
    } catch (err) { setMsgs(m => { const c = [...m]; c[c.length - 1] = { who: "bot", text: `⚠️ ${err.message || "Không đọc được tệp"}` }; return c; }); }
  };

  const copyMsg = (m, i) => {
    const lines = [m.text, ...(m.list || []), ...((m.tasks || []).map(t => `- ${t.title} (${t.dept} · ${nm(t.eid)} · ${fmtDate(t.deadline)})`))];
    navigator.clipboard?.writeText(lines.join("\n")).then(() => { setCopied(i); setTimeout(() => setCopied(-1), 1500); });
  };

  return (
    <>
      <button onClick={() => setOpen(o => !o)} title="Trợ lý tra cứu" style={{ position: "fixed", right: 20, bottom: 20, zIndex: 200, width: 56, height: 56, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff", fontSize: 26, cursor: "pointer", boxShadow: "0 6px 20px rgba(79,70,229,0.45)" }}>{open ? "✕" : "💬"}</button>
      {open && (
        <div style={{ position: "fixed", right: 20, bottom: 86, zIndex: 200, width: "min(390px, calc(100vw - 40px))", height: "min(580px, calc(100vh - 120px))", background: "#fff", borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid #e5e7eb" }}>
          <div style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff", padding: "12px 16px" }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>🤖 Trợ lý tra cứu</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>Hỏi tự nhiên · so sánh · lọc phòng+tháng · tìm/tóm tắt tệp</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10, background: "#f8fafc" }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.who === "me" ? "flex-end" : "flex-start", maxWidth: "88%", background: m.who === "me" ? "#4f46e5" : "#fff", color: m.who === "me" ? "#fff" : "#374151", border: m.who === "me" ? "none" : "1px solid #e5e7eb", borderRadius: 12, padding: "8px 12px", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {m.text}
                {m.list && m.list.length > 0 && <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>{m.list.map((li, k) => <div key={k} style={{ fontSize: 12.5 }}>{li}</div>)}</div>}
                {m.tasks && m.tasks.length > 0 && <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5 }}>{m.tasks.map(t => { const sc = STATUS[t.status]; return (
                  <div key={t.id} onClick={() => onOpenTask && onOpenTask(t)} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 9px", cursor: "pointer", background: "#f8fafc" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{t.dept} · {nm(t.eid)} · {fmtDate(t.deadline)} {sc && <span style={{ color: sc.col }}>· {sc.label}</span>}</div>
                  </div>); })}</div>}
                {m.who === "bot" && (m.list || m.tasks || m.profileEid) && (
                  <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {m.profileEid && onOpenProfile && <button onClick={() => { onOpenProfile(m.profileEid); setOpen(false); }} style={{ fontSize: 11.5, color: "#4338ca", background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 8, padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}>👤 Xem chi tiết</button>}
                    <button onClick={() => copyMsg(m, i)} style={{ fontSize: 11.5, color: "#6b7280", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>{copied === i ? "✓ Đã sao chép" : "⧉ Sao chép"}</button>
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          {msgs.length <= 1 && (
            <div style={{ padding: "6px 10px", display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid #f3f4f6", maxHeight: 130, overflowY: "auto" }}>
              {SUGGESTIONS.map(s => <button key={s} onClick={() => s.includes("...") ? setInput(s) : send(s)} style={{ fontSize: 11.5, background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe", borderRadius: 14, padding: "4px 10px", cursor: "pointer" }}>{s}</button>)}
            </div>
          )}
          <div style={{ padding: 10, borderTop: "1px solid #e5e7eb", display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => fileRef.current && fileRef.current.click()} title="Tải tệp PDF/Word lên để tóm tắt" style={{ background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe", borderRadius: 10, width: 38, height: 38, cursor: "pointer", fontSize: 17, flexShrink: 0 }}>📎</button>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: "none" }} onChange={onFile} />
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }} placeholder="Hỏi, tìm việc, hoặc 📎 tải tệp…" style={{ flex: 1, padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 13 }} />
            <button onClick={() => send()} style={{ background: "#4f46e5", color: "#fff", border: "none", borderRadius: 10, padding: "0 16px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Gửi</button>
          </div>
        </div>
      )}
    </>
  );
}
