import React, { useState, useRef, useEffect, useMemo } from "react";
import { DEPTS, STATUS } from "../constants";
import { fmtDate } from "../helpers";
import { MANAGER_EMP_ROLES } from "../hooks/useReports";
import { GUIDE_SECTIONS, sectionText } from "../guideContent";
import { buildModel, classify as classifyLearn, fetchLearning, logInteraction, normQ } from "../chatLearning";
import { classify, scoreSlots } from "../chatIntent";
import { aiEnabled, parseWithAI } from "../aiIntent";

// Trợ lý tra cứu THUẦN THUẬT TOÁN (không dùng AI ngoài): nhớ ngữ cảnh hội thoại, chịu gõ sai (fuzzy),
// gợi ý khi gõ, truy vấn ngưỡng/thống kê, biểu đồ mini, nút hành động, chào bằng điểm nóng, nhập giọng nói.
const strip = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
const has = (qn, ...arr) => arr.some(w => qn.includes(w));

// Chỉ mục tài liệu hướng dẫn (dựng 1 lần) để trả lời câu hỏi "cách dùng"
const GUIDE_INDEX = (() => {
  const idx = GUIDE_SECTIONS.map(s => { const lines = sectionText(s); return { s, lines, hay: strip(lines.join(" \n ")), titleS: strip(s.title) }; });
  const df = {};
  for (const it of idx) { const seen = new Set(it.hay.split(/[^a-z0-9]+/).filter(w => w.length >= 3)); for (const w of seen) df[w] = (df[w] || 0) + 1; }
  return { idx, df, N: idx.length };
})();
const GUIDE_STOP = new Set(["cach", "lam", "sao", "the", "nao", "huong", "dan", "de", "o", "dau", "su", "dung", "phan", "mem", "toi", "minh", "muon", "gi", "co", "nhu", "va", "cho", "khi", "bang", "duoc", "khong", "la", "mot", "cai", "nay"]);
const lev = (a, b) => { a = a || ""; b = b || ""; const m = a.length, n = b.length; if (!m) return n; if (!n) return m; let prev = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n]; };

export default function AssistantChat({ employees, computed, calcMonthPerf, managerPerf, empReliability, activeLoadByEid, getEmp, isCompletedStatus, onOpenTask, onOpenProfile, onOpenHelp, isMobile, me, onCreate }) {
  // Tìm trong TÀI LIỆU HƯỚNG DẪN để trả lời câu "cách dùng" (chấm điểm IDF + cụm 2 từ)
  const searchGuide = qn => {
    const { idx, df, N } = GUIDE_INDEX;
    const toks = qn.split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !GUIDE_STOP.has(w));
    if (!toks.length) return null;
    const bigrams = []; for (let k = 0; k + 1 < toks.length; k++) bigrams.push(toks[k] + " " + toks[k + 1]);
    let best = null, bs = 0;
    for (const it of idx) {
      let score = 0;
      for (const w of toks) { const c = it.hay.split(w).length - 1; if (c > 0) { const idf = Math.log(1 + N / (df[w] || 1)); score += Math.min(c, 3) * idf; if (it.titleS.includes(w)) score += 2 * idf; } }
      for (const bg of bigrams) { if (it.hay.includes(bg)) score += 4; if (it.titleS.includes(bg)) score += 6; }
      if (score > bs) { bs = score; best = it; }
    }
    if (!best || bs === 0) return null;
    const ml = best.lines.filter(l => { const ls = strip(l); return toks.some(w => ls.includes(w)); }).slice(0, 6);
    const picked = (ml.length ? ml : best.lines.slice(1, 5)).map(l => "• " + l);
    return { text: `📘 ${best.s.icon} ${best.s.title}`, list: picked, guide: true };
  };

  const today = new Date(); const y = today.getFullYear();
  const nm = id => getEmp(id)?.name || "—";
  const dleftOf = t => { const d = new Date(t.deadline); if (isNaN(d)) return 9999; d.setHours(0, 0, 0, 0); return Math.ceil((d - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000); };

  // #9 — Chào chủ động bằng "điểm nóng hôm nay"
  const greeting = () => {
    const risk = computed.filter(t => !isCompletedStatus(t.status) && !t.completion_requested && t.status !== "overdue" && dleftOf(t) >= 0 && dleftOf(t) <= 3 && (t.progress || 0) < 60).length;
    const overdue = computed.filter(t => t.status === "overdue").length;
    const pending = computed.filter(t => t.status === "pending_approval").length;
    const bits = [];
    if (risk) bits.push(`${risk} việc sắp trễ`);
    if (overdue) bits.push(`${overdue} việc quá hạn`);
    if (pending) bits.push(`${pending} việc chờ duyệt`);
    const hot = bits.length ? `🔥 Điểm nóng hôm nay: ${bits.join(" · ")}.` : "✅ Hôm nay chưa có điểm nóng nào.";
    return { who: "bot", text: `${hot}\nHỏi tôi về một người, so sánh 2 người, lọc theo phòng + tháng, truy vấn số ("ai có hơn 10 việc?"), tìm việc, hỏi cách dùng phần mềm ("làm sao để giao việc?"), hoặc bấm 📎 tải tệp lên tóm tắt. 🎤 có thể hỏi bằng giọng nói.` };
  };

  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([greeting()]);
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(-1);
  const [listening, setListening] = useState(false);
  const [showAc, setShowAc] = useState(false);
  const ctxRef = useRef({ person: null, dept: null, period: null });
  const endRef = useRef(null); const fileRef = useRef(null); const recRef = useRef(null);
  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  // ── TỰ HỌC (TF-IDF + KNN) ──
  const [model, setModel] = useState(null);      // mô hình phân loại dựng từ dữ liệu đã học
  const rowsRef = useRef([]);                     // kho mẫu đã học (nạp từ Supabase + bổ sung trong phiên)
  const [reacted, setReacted] = useState({});     // idx tin nhắn -> đã đánh giá
  const [correcting, setCorrecting] = useState(-1); // idx tin nhắn đang "dạy lại"
  const [corrText, setCorrText] = useState("");
  const [showExplain, setShowExplain] = useState({}); // idx -> mở "vì sao điểm này"
  useEffect(() => { fetchLearning().then(rows => { rowsRef.current = rows; setModel(buildModel(rows)); }); }, []);
  const rebuild = () => setModel(buildModel(rowsRef.current));

  const parsePeriod = qn => {
    const monthRange = mi => { const d = new Date(y, mi, 1); return { from: new Date(d.getFullYear(), d.getMonth(), 1), to: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59), label: `tháng ${d.getMonth() + 1}/${d.getFullYear()}`, monthIdx: d.getMonth() }; };
    let m;
    if ((m = qn.match(/thang\s*(\d{1,2})/))) return monthRange(Math.min(11, Math.max(0, +m[1] - 1)));
    if (/thang truoc/.test(qn)) return monthRange(today.getMonth() - 1);
    if ((m = qn.match(/quy\s*([1-4])/))) { const q = +m[1], s = (q - 1) * 3; return { from: new Date(y, s, 1), to: new Date(y, s + 3, 0, 23, 59, 59), label: `quý ${q}/${y}` }; }
    if (/hom qua/.test(qn)) { const d = new Date(today); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); const e = new Date(d); e.setHours(23, 59, 59, 999); return { from: d, to: e, label: "hôm qua" }; }
    if (/hom nay/.test(qn)) { const d = new Date(today); d.setHours(0, 0, 0, 0); const e = new Date(today); e.setHours(23, 59, 59, 999); return { from: d, to: e, label: "hôm nay" }; }
    if (/tuan nay/.test(qn)) { const d = new Date(today); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); d.setHours(0, 0, 0, 0); const e = new Date(d); e.setDate(e.getDate() + 6); e.setHours(23, 59, 59, 999); return { from: d, to: e, label: "tuần này" }; }
    if (/thang nay|hien tai/.test(qn)) return monthRange(today.getMonth());
    if ((m = qn.match(/(\d+)\s*ngay/))) { const d = new Date(today); d.setDate(d.getDate() - +m[1]); return { from: d, to: new Date(today), label: `${m[1]} ngày qua` }; }
    if (/nam nay/.test(qn)) return { from: new Date(y, 0, 1), to: new Date(y, 11, 31, 23, 59, 59), label: `năm ${y}` };
    return null;
  };
  const findPersons = qn => { const cand = []; const seen = new Set(); for (const e of (employees || [])) { const en = strip(e.name); if (qn.includes(en)) cand.push({ e, len: en.length, at: qn.indexOf(en) }); else { const last = en.split(" ").slice(-2).join(" "); if (last.length >= 5 && qn.includes(last)) cand.push({ e, len: last.length, at: qn.indexOf(last) }); } } cand.sort((a, b) => b.len - a.len); const out = []; for (const c of cand) if (!seen.has(c.e.id)) { seen.add(c.e.id); out.push(c); } return out.sort((a, b) => a.at - b.at).map(c => c.e); };
  // #2 — fuzzy: khớp tên dù gõ sai/thiếu (≥2 từ trong tên khớp exact hoặc lệch ≤1 ký tự)
  // Từ KHUNG CÂU (không bao giờ là tên người) — loại trước khi dò tên "mờ", tránh khớp nhầm kiểu
  // "trong tháng nay ai" → "Trương Thanh Tài" (trong≈Trương, tháng≈Thanh, ai≈Tài).
  const NAME_STOP = new Set(["toi", "co", "giao", "viec", "cho", "ai", "trong", "thang", "nay", "chua", "cua", "la", "gi", "va", "voi", "phong", "nhiem", "vu", "cong", "de", "cac", "mot", "nguoi", "nhan", "vien", "quy", "nam", "diem", "so", "sanh", "hon", "duoi", "nhat", "nhieu", "it", "sao", "the", "nao", "hoan", "dang", "lam", "xong", "tre", "han", "muon", "xem", "tim", "bao", "cao", "con", "ma", "thi", "nhu", "hay", "giup", "di", "moi", "ban", "roi", "duoc", "khong", "hom", "thoi", "tiet"]);
  // Yêu cầu ≥2 từ trong tên khớp CHÍNH XÁC (tránh nhầm các âm tiết lệch 1 ký tự: Xuân↔Tuấn, Quang↔Quân,
  // Toàn↔Tuấn…). Chỉ cho lệch ≤1 ký tự như điểm CỘNG THÊM trên âm dài (≥5), không tính vào 2 khớp bắt buộc.
  const fuzzyPerson = qn => { const qt = qn.split(/[^a-z0-9]+/).filter(w => w.length >= 2 && !NAME_STOP.has(w)); let best = null, bs = 1; for (const e of (employees || [])) { const nt = strip(e.name).split(" ").filter(Boolean); let ex = 0, fz = 0; for (const w of nt) { if (qt.some(q => q === w)) ex++; else if (w.length >= 5 && qt.some(q => q.length >= 5 && lev(q, w) <= 1)) fz++; } const mt = ex + fz; if (ex >= 2 && mt > bs) { bs = mt; best = e; } } return best; };
  const findDept = qn => (DEPTS || []).find(d => qn.includes(strip(d)));

  const rankMap = (map, dir = "desc") => Object.entries(map).sort((a, b) => dir === "desc" ? b[1] - a[1] : a[1] - b[1]);
  const barsFrom = (entries, val = v => v) => entries.slice(0, 6).map(([id, v]) => ({ label: nm(id), value: val(v) }));
  const sixMonth = empId => { const s = []; for (let i = 5; i >= 0; i--) { const d = new Date(y, today.getMonth() - i, 1); const mp = calcMonthPerf(empId, d.getFullYear(), d.getMonth()); s.push(mp.resolved > 0 ? mp.perfScore : null); } return s; };
  const personStats = (person, period) => { const inP = t => { if (!period) return true; const d = new Date(t.deadline); return !isNaN(d) && d >= period.from && d <= period.to; }; const mi = period?.monthIdx ?? today.getMonth(); const inScope = computed.filter(t => t.eid === person.id && inP(t)); const late = inScope.filter(t => t.status === "completed_late" || t.status === "overdue").length; const openN = computed.filter(t => t.eid === person.id && !isCompletedStatus(t.status)).length; const rel = empReliability[person.id]; const load = activeLoadByEid[person.id]; const isMgr = MANAGER_EMP_ROLES.includes(person.role); const m = isMgr && managerPerf ? managerPerf(person.id, y, mi) : calcMonthPerf(person.id, y, mi); const rslv = isMgr ? m.resolvedW : m.resolved; return { total: inScope.length, late, openN, loadW: load ? load.w : 0, onTime: rel?.onTimeRate, avgDays: rel?.avgDays, score: rslv > 0 ? m.perfScore : null, eligible: m.eligible, mi, isMgr, perf: m }; };

  const answer = (raw, aiSlots) => {
    const qn = strip(raw);
    // YÊU CẦU SOẠN/VIẾT VĂN BẢN → nhường cho AI viết (câu thường chứa tên phòng/ngày như "phòng HT-NTS,
    // nghỉ 2 ngày" khiến bộ dữ liệu tưởng nhầm là hồ sơ phòng). Đánh dấu unsure để send() gọi AI.
    if (!aiSlots && has(qn, "viet giup", "viet ho", "viet cho toi", "viet mot", "viet don", "viet email", "viet to trinh", "viet cong van", "viet bao cao", "viet thong bao", "viet ke hoach", "viet ban", "soan giup", "soan ho", "soan cho toi", "soan mot", "soan thao", "soan don", "soan email", "soan van ban", "giup toi viet", "giup toi soan", "thao giup")) return { unsure: true, wantWrite: true };
    // #1 — ngữ cảnh follow-up
    const fu = has(qn, "the con", "con ", "vay con", "con lai", "vay thi", "the thi", "thi sao", "con nua");
    // Tên gõ ĐẦY ĐỦ (findPersons) → nhận ngay. Tên ĐOÁN MỜ (fuzzyPerson) chỉ nhận khi câu thực sự hỏi
    // về CÔNG VIỆC/HỒ SƠ của người đó — tránh khớp nhầm tên trong câu hỏi tính năng
    // (VD "Lê Xuân Quang có đăng nhập phần mềm không" ⇏ hồ sơ "Lê Quang Thanh").
    let person = findPersons(qn)[0] || null;
    if (!person) { const fp = fuzzyPerson(qn); if (fp && has(qn, "viec", "nhiem vu", "diem", "ho so", "tien do", "qua han", "tre han", "hoan thanh", "dung han", "nang suat", "phu trach", "dang lam", "xep loai", "cham diem", "bao nhieu", "the nao", "ra sao", "lam an")) person = fp; }
    let dept = findDept(qn) || null;
    let period = parsePeriod(qn);
    if (fu) { person = person || ctxRef.current.person; dept = dept || ctxRef.current.dept; period = period || ctxRef.current.period; }
    ctxRef.current = { person, dept, period };
    const inPeriod = t => { if (!period) return true; const d = new Date(t.deadline); return !isNaN(d) && d >= period.from && d <= period.to; };
    const deptOk = t => !dept || t.dept === dept;
    const relDeptOk = id => !dept || getEmp(id)?.dept === dept;
    const both = t => inPeriod(t) && deptOk(t);
    const scope = [dept ? `phòng ${dept}` : "", period ? period.label : ""].filter(Boolean).join(", ");
    const sc = scope ? ` (${scope})` : "";
    // ngưỡng số (#5): hơn/trên/dưới N
    const thr = (() => { let m; if ((m = qn.match(/(hon|tren|lon hon|>=?|nhieu hon)\s*(\d+)/))) return { op: ">", n: +m[2] }; if ((m = qn.match(/(duoi|it hon|nho hon|<=?)\s*(\d+)/))) return { op: "<", n: +m[2] }; return null; })();

    // 0) Câu hỏi CÁCH DÙNG phần mềm → tra tài liệu hướng dẫn
    if (has(qn, "cach ", "lam sao", "lam the nao", "huong dan", "su dung", "o dau", "bang cach", "cach de", "dung the nao", "thao tac", "the nao de")) { const g = searchGuide(qn); if (g) return g; }

    // #1 — LỆNH: mở form tạo việc (AN TOÀN: chỉ mở form để bạn tự điền & bấm lưu, không tự ý ghi)
    if (has(qn, "tao viec moi", "tao nhiem vu moi", "giao viec moi", "them viec moi", "muon tao viec", "tao mot viec", "mo form tao", "tao giup toi viec")) return { text: "Mở form tạo việc mới cho bạn — điền thông tin rồi bấm lưu nhé.", action: "create" };

    // ── Bộ trả lời tái dùng ──
    const who = t => !person || t.eid === person.id;
    const statusList = (label, pred) => { const res = computed.filter(t => both(t) && who(t) && pred(t)).sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 12); const scope2 = [person ? person.name : "", dept ? `phòng ${dept}` : "", period ? period.label : ""].filter(Boolean).join(", "); const s2 = scope2 ? ` (${scope2})` : ""; if (!res.length) return { text: `Không có ${label.toLowerCase()}${s2}.` }; return { text: `${label}${s2} — ${res.length} việc:`, tasks: res }; };
    const doSearch = () => { const stop = new Set(["tim", "kiem", "tra", "cuu", "viec", "cong", "nhiem", "vu", "co", "nao", "ve", "cua", "la", "gi", "cho", "toi", "ai", "o", "va", "the", "nhat", "trong", "danh", "sach", "cac", "nhung", "hay", "giup", "xem", "lien", "quan", "den"]); const toks = qn.split(/[^a-z0-9]+/).filter(w => w.length >= 2 && !stop.has(w)); if (!toks.length) return null; const res = computed.map(t => { const hay = strip((t.title || "") + " " + (t.description || "")); return { t, hits: toks.filter(w => hay.includes(w)).length }; }).filter(x => x.hits > 0).sort((a, b) => b.hits - a.hits).slice(0, 7); return res.length ? { text: `🔎 Tìm thấy ${res.length} nhiệm vụ khớp:`, tasks: res.map(x => x.t) } : null; };
    const countTasks = () => { const map = {}; for (const t of computed) { if (!t.eid || !both(t)) continue; map[t.eid] = (map[t.eid] || 0) + 1; } return map; };
    const persons = findPersons(qn);

    // ── PHÂN LOẠI Ý ĐỊNH: chấm điểm mọi ý định rồi chọn cái mạnh nhất (thay cho khớp-nhánh-đầu-tiên) ──
    // Ý 3: nếu có slots do AI bóc (khi bộ nội bộ bí) → chấm điểm trên slots AI thay vì tự tách từ câu.
    const ctx = { personCount: persons.length || (person ? 1 : 0), hasDept: !!dept };
    const dec = aiSlots ? scoreSlots(aiSlots, ctx) : classify(qn, ctx);
    const K = dec.kind, sl = dec.slots;
    const STLABEL = { pending_approval: "chờ duyệt", overdue: "quá hạn", completed: "hoàn thành", in_progress: "đang làm" };
    const und = [dept ? `phòng ${dept}` : (sl.subject === "org" ? "toàn cơ quan" : ""), (person && persons.length <= 1) ? person.name : "", period ? period.label : "", sl.status ? STLABEL[sl.status] : "", sl.metric || "", sl.order === "asc" ? "thấp→cao" : sl.order === "desc" ? "cao→thấp" : ""].filter(Boolean).join(" · ");
    // Gắn "understood" (đã hiểu gì) và cờ "weak" khi bộ nội bộ KÉM CHẮC CHẮN (dec.ambiguous) — để send()
    // biết nên nhờ AI xem lại. Không gắn weak nếu câu này chính là do AI bóc (aiSlots) để tránh lặp.
    const U = a => { if (!a || a.unsure) return a; const r = und ? { ...a, understood: und } : { ...a }; if (dec.ambiguous && !aiSlots) r.weak = true; return r; };

    if (K === "guide") { const g = searchGuide(qn); if (g) return g; }
    if (K === "create") return { text: "Mở form tạo việc mới cho bạn — điền thông tin rồi bấm lưu nhé.", action: "create" };
    // "việc DO TÔI giao" — lọc việc mình là người giao (created_by_name === họ tên đang đăng nhập).
    if (K === "my_assigned") {
      const meN = strip(me || "");
      let mine = computed.filter(t => both(t) && strip(t.created_by_name || "") === meN);
      // Nếu câu nêu 1 người cụ thể ("... giao việc gì cho Võ Thị Hiền") → lọc riêng người đó & LIỆT KÊ việc.
      if (person) {
        mine = mine.filter(t => t.eid === person.id);
        if (!mine.length) return U({ text: `Bạn chưa giao việc nào cho ${person.name}${period ? ` (${period.label})` : ""}.` });
        return U({ text: `📤 Việc bạn giao cho ${person.name}${period ? ` (${period.label})` : ""} — ${mine.length} việc:`, tasks: mine.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 12) });
      }
      if (!mine.length) return U({ text: `Bạn chưa giao việc nào${period ? ` (${period.label})` : " trong kỳ này"}.` });
      const map = {}; for (const t of mine) { if (t.eid) map[t.eid] = (map[t.eid] || 0) + 1; }
      const bars = Object.entries(map).sort((a, b) => b[1] - a[1]).map(([id, v]) => ({ label: nm(id), value: v }));
      return U({ text: `📤 Việc bạn đã giao${period ? ` (${period.label})` : ""} — ${mine.length} việc cho ${bars.length} người:`, bars });
    }
    if (K === "compare" && persons.length >= 2) { const [a, b] = persons; const sa = personStats(a, period), sb = personStats(b, period); return U({ text: `⚖️ So sánh${sc}:`, list: [`Số việc: ${a.name} ${sa.total} · ${b.name} ${sb.total}`, `Trễ/quá hạn: ${a.name} ${sa.late} · ${b.name} ${sb.late}`, `Đúng hạn (lịch sử): ${a.name} ${sa.onTime ?? "—"}% · ${b.name} ${sb.onTime ?? "—"}%`, `Điểm tháng ${sa.mi + 1}: ${a.name} ${sa.score ?? "—"} · ${b.name} ${sb.score ?? "—"}`, `Đang mở: ${a.name} ${sa.openN} · ${b.name} ${sb.openN}`] }); }
    if (K === "list") { const st = sl.status || (sl.late ? "overdue" : null); if (st === "pending_approval") return U(statusList("Việc đang chờ duyệt", t => t.status === "pending_approval")); if (st === "overdue") return U(statusList("Việc quá hạn", t => t.status === "overdue")); if (st === "completed") return U(statusList("Việc đã hoàn thành", t => isCompletedStatus(t.status))); if (st === "in_progress") return U(statusList("Việc đang thực hiện", t => !isCompletedStatus(t.status) && t.status !== "pending_approval")); const r = doSearch(); if (r) return r; }
    if (K === "upcoming") { const res = computed.filter(t => deptOk(t) && !isCompletedStatus(t.status) && !t.completion_requested && t.status !== "overdue" && dleftOf(t) >= 0 && dleftOf(t) <= 3 && (t.progress || 0) < 60).sort((a, b) => dleftOf(a) - dleftOf(b)).slice(0, 7); if (!res.length) return { text: `Không có việc nào sắp trễ${dept ? ` ở phòng ${dept}` : ""}. 👍` }; return U({ text: `⚠️ ${res.length} việc sắp trễ${dept ? ` (phòng ${dept})` : ""}:`, tasks: res }); }
    if (K === "count") { if (sl.late || sl.status === "overdue") { const n = computed.filter(t => t.status === "overdue" && both(t)).length; return U({ text: `Hiện có ${n} việc quá hạn${sc}.` }); } const n = computed.filter(both).length; return U({ text: `Tổng ${n} nhiệm vụ${sc}.` }); }
    if (K === "aggregate") { if (sl.avg) { const map = {}; for (const t of computed) { if (t.eid && both(t)) map[t.eid] = (map[t.eid] || 0) + 1; } const vals = Object.values(map); const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : 0; return U({ text: `Trung bình mỗi người ${avg} việc${sc}.` }); } const dt = computed.filter(both); const done = dt.filter(t => isCompletedStatus(t.status)).length; return U({ text: `Tỷ lệ hoàn thành chung${sc}: ${dt.length ? Math.round(done / dt.length * 100) : 0}% (${done}/${dt.length}).` }); }
    if (K === "threshold" && thr) { if (thr.op === ">" && (sl.late || sl.status === "overdue") && has(qn, "ngay")) { const res = computed.filter(t => t.status === "overdue" && deptOk(t) && -dleftOf(t) > thr.n).sort((a, b) => dleftOf(a) - dleftOf(b)).slice(0, 8); if (!res.length) return { text: `Không có việc nào quá hạn trên ${thr.n} ngày${dept ? ` (phòng ${dept})` : ""}.` }; return U({ text: `Việc quá hạn trên ${thr.n} ngày:`, tasks: res }); } if (sl.subject === "dept" || has(qn, "ty le", "%")) { const byDept = {}; for (const t of computed) { if (!t.dept || !inPeriod(t)) continue; if (!byDept[t.dept]) byDept[t.dept] = { total: 0, done: 0 }; byDept[t.dept].total++; if (isCompletedStatus(t.status)) byDept[t.dept].done++; } const rows = Object.entries(byDept).map(([d, v]) => ({ d, rate: v.total ? Math.round(v.done / v.total * 100) : 0 })).filter(x => thr.op === ">" ? x.rate > thr.n : x.rate < thr.n); if (!rows.length) return { text: `Không có phòng nào ${thr.op === ">" ? "trên" : "dưới"} ${thr.n}%.` }; return U({ text: `Phòng ${thr.op === ">" ? "trên" : "dưới"} ${thr.n}% hoàn thành:`, bars: rows.map(x => ({ label: x.d, value: x.rate })) }); } const map = {}; for (const t of computed) { if (t.eid && both(t)) map[t.eid] = (map[t.eid] || 0) + 1; } const r = Object.entries(map).filter(([, v]) => thr.op === ">" ? v > thr.n : v < thr.n).sort((a, b) => b[1] - a[1]); if (!r.length) return { text: `Không có ai ${thr.op === ">" ? "trên" : "dưới"} ${thr.n} việc${sc}.` }; return U({ text: `Người ${thr.op === ">" ? "có hơn" : "có dưới"} ${thr.n} việc${sc}:`, bars: barsFrom(r) }); }
    if (K === "rank_dept_overdue") { const byDept = {}; for (const t of computed) { if (!t.dept || !inPeriod(t)) continue; if (t.status === "overdue" || t.status === "completed_late") byDept[t.dept] = (byDept[t.dept] || 0) + 1; } const rows = Object.entries(byDept).sort((a, b) => b[1] - a[1]); if (!rows.length) return { text: `Không phòng nào có việc trễ/quá hạn${period ? ` (${period.label})` : ""}. 👍` }; return U({ text: `Phòng nhiều việc trễ/quá hạn nhất${period ? ` (${period.label})` : ""}:`, bars: rows.map(([d, v]) => ({ label: d, value: v })) }); }
    if (K === "rank_dept_rate") { const byDept = {}; for (const t of computed) { if (!t.dept || !inPeriod(t)) continue; if (!byDept[t.dept]) byDept[t.dept] = { total: 0, done: 0 }; byDept[t.dept].total++; if (isCompletedStatus(t.status)) byDept[t.dept].done++; } const rows = Object.entries(byDept).map(([d, v]) => ({ d, rate: v.total ? Math.round(v.done / v.total * 100) : 0 })); if (!rows.length) return { text: `Chưa có dữ liệu phòng ban${period ? ` (${period.label})` : ""}.` }; const asc = sl.order === "asc"; rows.sort((a, b) => asc ? a.rate - b.rate : b.rate - a.rate); return U({ text: `Tỷ lệ hoàn thành theo phòng${period ? ` (${period.label})` : ""}:`, bars: rows.map(x => ({ label: x.d, value: x.rate })) }); }
    if (K === "rank_people") {
      if (sl.metric === "score") { const mi = period?.monthIdx ?? today.getMonth(); const rows = (employees || []).filter(e => !e.no_kpi && (!dept || e.dept === dept)).map(e => ({ e, m: calcMonthPerf(e.id, y, mi) })).filter(x => x.m.resolved > 0); if (!rows.length) return { text: `Chưa có ai đủ dữ liệu chấm điểm${sc || ` tháng ${mi + 1}`}.` }; const asc = sl.order === "asc"; rows.sort((a, b) => asc ? a.m.perfScore - b.m.perfScore : b.m.perfScore - a.m.perfScore); return U({ text: `Điểm${sc || ` tháng ${mi + 1}`} (${asc ? "thấp → cao" : "cao → thấp"}):`, bars: rows.slice(0, 6).map(x => ({ label: x.e.name, value: x.m.perfScore })) }); }
      if (sl.metric === "ontime") { const r = Object.entries(empReliability || {}).filter(([id, v]) => v.onTimeRate != null && v.resolved >= 3 && !getEmp(id)?.no_kpi && relDeptOk(id)).sort((a, b) => b[1].onTimeRate - a[1].onTimeRate); if (!r.length) return { text: "Chưa đủ dữ liệu lịch sử để xếp hạng đúng hạn." }; return U({ text: `Đúng hạn cao nhất${dept ? ` (phòng ${dept})` : ""} (lịch sử):`, bars: r.slice(0, 6).map(([id, v]) => ({ label: nm(id), value: v.onTimeRate })) }); }
      if (sl.metric === "speed") { const r = Object.entries(empReliability || {}).filter(([id, v]) => v.avgDays != null && v.resolved >= 3 && !getEmp(id)?.no_kpi && relDeptOk(id)).sort((a, b) => a[1].avgDays - b[1].avgDays); if (!r.length) return { text: "Chưa đủ dữ liệu để tính tốc độ." }; return U({ text: `Hoàn thành nhanh nhất${dept ? ` (phòng ${dept})` : ""} (ngày/việc):`, bars: r.slice(0, 6).map(([id, v]) => ({ label: nm(id), value: v.avgDays })) }); }
      if (sl.metric === "load") { const r = Object.entries(activeLoadByEid || {}).filter(([id]) => relDeptOk(id)).sort((a, b) => b[1].w - a[1].w); if (!r.length) return { text: "Hiện không ai có việc đang mở." }; return U({ text: `Đang gánh nhiều việc mở nhất${dept ? ` (phòng ${dept})` : ""} (quy đổi):`, bars: r.slice(0, 6).map(([id, v]) => ({ label: nm(id), value: v.w })) }); }
      if (sl.metric === "free") { const withLoad = new Set(Object.keys(activeLoadByEid || {})); const free = (employees || []).filter(e => !e.no_kpi && (!dept || e.dept === dept) && !withLoad.has(e.id)); if (free.length) return U({ text: `Đang rảnh${dept ? ` (phòng ${dept})` : ""} (không có việc mở):`, list: free.slice(0, 6).map((e, i) => `${i + 1}. ${e.name} (${e.dept})`) }); const r = Object.entries(activeLoadByEid || {}).filter(([id]) => relDeptOk(id)).sort((a, b) => a[1].w - b[1].w); return U({ text: "Ít việc mở nhất (quy đổi):", bars: r.slice(0, 6).map(([id, v]) => ({ label: nm(id), value: v.w })) }); }
      if (sl.late) { const map = {}; for (const t of computed) { if (!t.eid || !both(t)) continue; if (!(t.status === "completed_late" || t.status === "overdue")) continue; map[t.eid] = (map[t.eid] || 0) + 1; } const r = rankMap(map); if (!r.length) return { text: `Không có việc trễ/quá hạn nào${sc}. 👍` }; return U({ text: `Người nhiều việc trễ/quá hạn nhất${sc}:`, bars: barsFrom(r) }); }
      // GHÉP ĐIỀU KIỆN: "ai nhiều việc [trạng thái] nhất" / "việc [trạng thái] phòng X do ai phụ trách"
      // → đếm theo NGƯỜI nhưng CHỈ việc đúng trạng thái đó (không phải mọi việc như nhánh mặc định).
      if (sl.status) {
        const stOk = st => sl.status === "pending_approval" ? st === "pending_approval" : sl.status === "completed" ? isCompletedStatus(st) : sl.status === "overdue" ? st === "overdue" : (!isCompletedStatus(st) && st !== "pending_approval");
        const map = {}; for (const t of computed) { if (!t.eid || !both(t)) continue; if (stOk(t.status)) map[t.eid] = (map[t.eid] || 0) + 1; }
        const r = rankMap(map, sl.order === "asc" ? "asc" : "desc");
        if (!r.length) return { text: `Không có ai có việc ${STLABEL[sl.status]}${sc}. 👍` };
        return U({ text: `Người ${sl.order === "asc" ? "ít" : "nhiều"} việc ${STLABEL[sl.status]} nhất${sc}:`, bars: barsFrom(r) });
      }
      const r = rankMap(countTasks(), sl.order === "asc" ? "asc" : "desc"); if (!r.length) return { text: `Không có dữ liệu việc${sc}.` }; return U({ text: `Người ${sl.order === "asc" ? "ít" : "nhiều"} việc nhất${sc}:`, bars: barsFrom(r) });
    }
    if (K === "person" && person) { const s = personStats(person, period); const list = [`Số việc${sc}: ${s.total}${s.late ? ` · trễ/quá hạn: ${s.late}` : ""}`, `Đang mở: ${s.openN} việc${s.loadW ? ` (≈${s.loadW} quy đổi)` : ""}`]; if (s.onTime != null) list.push(`Đúng hạn (lịch sử): ${s.onTime}%${s.avgDays != null ? ` · TB ~${s.avgDays} ngày/việc` : ""}`); if (s.score != null) list.push(`${s.isMgr ? "🏛️ Điểm điều hành" : "Điểm"} tháng ${s.mi + 1}: ${s.score}đ${s.eligible ? "" : " (tham khảo)"}`); const p = s.perf; const explain = (!s.isMgr && s.score != null && p) ? [`Việc đã đến hạn (quy đổi): ${p.total} · trong đó đúng hạn ${p.onTime}, trễ ${p.completedLate}, quá hạn/tồn ${p.over}`, `Tỷ lệ hoàn thành: ${p.completionRate}% · đủ điều kiện chốt điểm khi ≥5 việc đến hạn (${p.eligible ? "đủ ✓" : "chưa đủ — điểm tham khảo"})`, `Cách tính: điểm = phần đúng hạn (cộng) − phần trễ/quá hạn (trừ) + thưởng khối lượng, có nhân trọng số ưu tiên (nguồn: scoring.js — có kiểm thử).`] : null; const prevMi = (s.mi + 11) % 12; const followups = [`${person.name} tháng ${prevMi + 1}`, `Ai nhiều việc nhất phòng ${person.dept}`, `Ai trễ nhiều nhất phòng ${person.dept}`]; return { text: `👤 ${person.name} — ${person.dept}`, list, profileEid: person.id, spark: sixMonth(person.id), explain, followups, understood: und || undefined }; }
    if (K === "dept_profile" && dept) { const dt = computed.filter(t => t.dept === dept && inPeriod(t)); const done = dt.filter(t => isCompletedStatus(t.status)).length; return U({ text: `🏢 Phòng ${dept}${period ? ` (${period.label})` : ""}`, list: [`Tổng việc: ${dt.length} · Hoàn thành: ${done} (${dt.length ? Math.round(done / dt.length * 100) : 0}%)`, `Quá hạn: ${dt.filter(t => t.status === "overdue").length} · Đang mở: ${dt.filter(t => !isCompletedStatus(t.status)).length}`] }); }
    if (K === "search") { const r = doSearch(); if (r) return r; return { text: "Không tìm thấy nhiệm vụ nào khớp từ khoá đó." }; }

    // Không rõ ý → CHỈ tìm theo từ khoá nếu câu có vẻ hỏi VỀ VIỆC (có "việc"/"nhiệm vụ" hoặc ý tìm kiếm).
    // Câu lạc đề (VD "hôm nay thời tiết thế nào") không được trả về nhiệm vụ bừa — báo chưa rõ ý để
    // send() nhờ AI hiểu giúp (nếu bật) hoặc gợi ý "Ý bạn là…?".
    if (sl.hasViec || sl.search) { const sfb = doSearch(); if (sfb) return sfb; }
    return { text: "Mình là trợ lý tra cứu công việc, chưa rõ ý câu này. Thử hỏi: tên một người/phòng (+ tháng/quý), \"so sánh A với B\", \"ai có hơn 10 việc\", \"danh sách việc chờ duyệt\", hoặc \"tìm việc <từ khoá>\".", unsure: true };
  };

  const answerKind = a => a.guide ? "guide" : a.unsure ? "unknown" : a.clarify ? "clarify" : a.tasks ? "tasks" : a.bars ? "rank" : a.profileEid ? "profile" : a.list ? "info" : "text";
  // #8 — câu tôi hay hỏi (đếm theo từng người, lưu cục bộ)
  const freqKey = "qlcv_chatfreq_" + (me || "anon");
  const bumpFreq = q => { try { const o = JSON.parse(localStorage.getItem(freqKey) || "{}"); o[q] = (o[q] || 0) + 1; localStorage.setItem(freqKey, JSON.stringify(o)); } catch { /* ignore */ } };
  const topFreq = () => { try { const o = JSON.parse(localStorage.getItem(freqKey) || "{}"); return Object.entries(o).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([q]) => q); } catch { return []; } };
  // #2 — "Ý bạn là…?" gợi ý câu gần nhất từ mẫu câu quen + kho đã dạy lại
  const didYouMean = q => { const qs = strip(q); const qt = new Set(qs.split(/[^a-z0-9]+/).filter(w => w.length >= 2)); if (!qt.size) return []; const pool = new Set(acItems); for (const r of rowsRef.current) { if (r.corrected_q) pool.add(r.corrected_q); } const scored = [...pool].map(x => { const xs = strip(x); const xt = new Set(xs.split(/[^a-z0-9]+/).filter(w => w.length >= 2)); let inter = 0; for (const w of qt) if (xt.has(w)) inter++; const jac = inter / (qt.size + xt.size - inter || 1); const lv = 1 - lev(qs, xs) / Math.max(qs.length, xs.length || 1); return { x, s: Math.max(jac, lv * 0.75) }; }).sort((a, b) => b.s - a.s); return scored.filter(v => v.s >= 0.34).slice(0, 3).map(v => v.x); };
  // #2 + #4: chưa hiểu -> gợi ý "ý bạn là" & ghi nhận vào kho để admin biết chỗ trợ lý còn "mù"
  const finalizeUnsure = (q, ans) => { if (ans.unsure) { const dym = didYouMean(q); if (dym.length) ans = { ...ans, suggestions: dym }; logInteraction({ username: me, question: q, intent: "unknown", feedback: 0 }); } return ans; };
  const send = async (text) => {
    const q = (text ?? input).trim(); if (!q) return; setShowAc(false); bumpFreq(q); setInput("");
    let ans = answer(q);
    // TỰ HỌC: nếu không hiểu (hoặc có câu đã "dạy lại" rất giống) -> định tuyến sang câu đúng đã học
    const c = classifyLearn(model, q);
    if (c && c.corrected && (c.score >= 0.72 || (ans.unsure && c.score >= 0.42))) {
      const routed = answer(c.corrected);
      if (!routed.unsure) ans = { ...routed, learnedFrom: c.corrected };
    }
    // Ý 3: nhờ AI khi nội bộ BÍ (unsure) HOẶC KÉM CHẮC CHẮN (weak = câu mơ hồ), và AI được bật.
    //  - AI trả về slots  → chạy truy vấn TẠI CHỖ với ý AI bóc được (ưu tiên, vì hiểu tốt hơn).
    //  - AI trả về answer → câu NGOÀI phạm vi dữ liệu; chỉ hiển thị khi nội bộ bí hẳn (unsure),
    //    KHÔNG đè lên một câu trả lời dữ liệu chỉ vì mơ hồ.
    if ((ans.unsure || ans.weak) && aiEnabled) {
      setMsgs(m => [...m, { who: "me", text: q }, { who: "bot", text: "⏳ Đang hiểu câu hỏi…", pending: true }]);
      // Gửi kèm vài lượt gần nhất để AI hiểu câu nối tiếp ("viết giúp đi", "làm tiếp"…).
      const hist = msgs.slice(-6).filter(m => m.text && !m.pending).map(m => ({ role: m.who === "me" ? "user" : "model", text: m.text }));
      const ai = await parseWithAI(q, hist);
      if (ai && ai.slots) { const routed = answer(q, ai.slots); if (!routed.unsure) ans = { ...routed, viaAI: true }; }
      else if (ai && ai.answer && ans.unsure) { ans = { text: ai.answer, viaAI: true }; }
      ans = finalizeUnsure(q, ans);
      setMsgs(m => { const copy = [...m]; copy[copy.length - 1] = { who: "bot", ...ans, q, intent: ans.intent || answerKind(ans) }; return copy; });
      return;
    }
    ans = finalizeUnsure(q, ans);
    setMsgs(m => [...m, { who: "me", text: q }, { who: "bot", ...ans, q, intent: ans.intent || answerKind(ans) }]);
  };
  const speak = (m) => { try { const synth = window.speechSynthesis; if (!synth) return; synth.cancel(); const txt = [m.text, ...(m.list || []), ...((m.bars || []).map(b => `${b.label}: ${b.value}`))].join(". "); const u = new SpeechSynthesisUtterance(txt); u.lang = "vi-VN"; synth.speak(u); } catch { /* ignore */ } };
  // Ghi nhận phản hồi 👍 / 👎(+dạy lại) => bổ sung mẫu học & dựng lại mô hình ngay
  const giveFeedback = (i, val) => { const m = msgs[i]; if (!m || !m.q) return; logInteraction({ username: me, question: m.q, intent: m.intent, feedback: val }); rowsRef.current = [{ question: m.q, norm_q: normQ(m.q), corrected_q: null, feedback: val }, ...rowsRef.current]; rebuild(); setReacted(r => ({ ...r, [i]: "done" })); };
  const teach = (i) => { const m = msgs[i]; const corrected = corrText.trim(); if (!m || !m.q || !corrected) return; logInteraction({ username: me, question: m.q, intent: m.intent, feedback: -1, corrected }); rowsRef.current = [{ question: m.q, norm_q: normQ(m.q), corrected_q: corrected, feedback: -1 }, ...rowsRef.current]; rebuild(); setReacted(r => ({ ...r, [i]: "done" })); setCorrecting(-1); setCorrText(""); send(corrected); };
  const clarify = (base, chip) => { const p = strip(chip); const suffix = p.includes("phong hcth") ? " phòng HCTH" : p.includes("ql-ktdl") ? " phòng QL-KTDL" : p.includes("ht-nts") ? " phòng HT-NTS" : p.includes("thang nay") ? " tháng này" : ""; send((base + suffix).trim()); };

  const onFile = async (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; setMsgs(m => [...m, { who: "me", text: `📎 ${f.name}` }, { who: "bot", text: "⏳ Đang đọc & tóm tắt tệp…" }]); try { const [{ extractFileText }, { extractiveSummary }] = await Promise.all([import("../fileText"), import("../summarize")]); const text = await extractFileText(f); const r = extractiveSummary(text); const botMsg = r.ok ? { who: "bot", text: `📝 Tóm tắt "${f.name}":`, list: [...r.summarySentences, ...(r.deadlines.length ? ["⏰ Mốc thời gian: " + r.deadlines.join(" · ")] : [])] } : { who: "bot", text: `Không rút được nội dung có ý nghĩa từ "${f.name}".` }; setMsgs(m => { const c = [...m]; c[c.length - 1] = botMsg; return c; }); } catch (err) { setMsgs(m => { const c = [...m]; c[c.length - 1] = { who: "bot", text: `⚠️ ${err.message || "Không đọc được tệp"}` }; return c; }); } };

  const copyMsg = (m, i) => { const lines = [m.text, ...(m.list || []), ...((m.bars || []).map(b => `- ${b.label}: ${b.value}`)), ...((m.tasks || []).map(t => `- ${t.title} (${t.dept} · ${nm(t.eid)} · ${fmtDate(t.deadline)})`))]; navigator.clipboard?.writeText(lines.join("\n")).then(() => { setCopied(i); setTimeout(() => setCopied(-1), 1500); }); };
  const exportCsv = (m) => { let rows; if (m.tasks) rows = [["Nhiệm vụ", "Phòng", "Người", "Hạn", "Trạng thái"], ...m.tasks.map(t => [t.title, t.dept, nm(t.eid), fmtDate(t.deadline), STATUS[t.status]?.label || t.status])]; else if (m.bars) rows = [["Tên", "Giá trị"], ...m.bars.map(b => [b.label, b.value])]; else rows = [["Kết quả"], ...(m.list || [m.text]).map(l => [l])]; const csv = "﻿" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n"); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })); const a = document.createElement("a"); a.href = url; a.download = "tra-cuu.csv"; a.click(); URL.revokeObjectURL(url); };

  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const startVoice = () => { if (!SR) return; try { const r = new SR(); r.lang = "vi-VN"; r.interimResults = false; r.maxAlternatives = 1; r.onresult = e => { const txt = e.results[0][0].transcript; setInput(txt); setTimeout(() => send(txt), 120); }; r.onend = () => setListening(false); r.onerror = () => setListening(false); recRef.current = r; setListening(true); r.start(); } catch { setListening(false); } };

  // #3 — autocomplete
  const acItems = useMemo(() => { const names = (employees || []).filter(e => !e.no_kpi).map(e => e.name); const depts = (DEPTS || []).map(d => `Phòng ${d}`); const tpl = ["ai nhiều việc nhất", "ai trễ nhiều nhất", "ai làm nhanh nhất", "ai đúng hạn cao nhất", "việc nào sắp trễ", "phòng nào tốt nhất", "so sánh ", "tìm việc ", "ai có hơn 10 việc", "tỷ lệ hoàn thành chung", "trung bình mỗi người bao nhiêu việc", "làm sao để giao việc", "cách yêu cầu hoàn thành", "cách đánh giá nhân viên", "hướng dẫn phân quyền", "danh sách việc chờ duyệt", "danh sách việc quá hạn", "việc đang thực hiện", "phòng nào nhiều việc quá hạn nhất"]; return [...names, ...depts, ...tpl]; }, [employees]);
  const sugs = (showAc && input.trim().length >= 2) ? acItems.filter(x => strip(x).includes(strip(input.trim()))).slice(0, 6) : [];

  const barBlock = bars => { const mx = Math.max(...bars.map(b => b.value), 1); return (<div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>{bars.map((b, k) => (<div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 92, fontSize: 11, color: "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.label}</div><div style={{ flex: 1, height: 8, background: "#eef2ff", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", width: (b.value / mx * 100) + "%", background: "#6366f1" }} /></div><div style={{ width: 34, fontSize: 11, textAlign: "right", color: "#4338ca", fontWeight: 600 }}>{b.value}</div></div>))}</div>); };
  const sparkBlock = pts => { const w = 190, h = 38, pad = 4; const xs = i => pad + i * (w - 2 * pad) / (pts.length - 1); const ys = v => h - pad - (v / 100) * (h - 2 * pad); const d = pts.map((v, i) => v == null ? null : `${xs(i)},${ys(v)}`).filter(Boolean).join(" "); return (<div style={{ marginTop: 6 }}><div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>Xu hướng điểm 6 tháng</div><svg width={w} height={h} style={{ display: "block" }}><polyline fill="none" stroke="#6366f1" strokeWidth="2" points={d} />{pts.map((v, i) => v != null && <circle key={i} cx={xs(i)} cy={ys(v)} r="2.5" fill="#4338ca" />)}</svg></div>); };

  return (
    <>
      <button onClick={() => setOpen(o => !o)} title="Trợ lý tra cứu" style={{ position: "fixed", right: isMobile ? 14 : 20, bottom: isMobile ? "calc(70px + env(safe-area-inset-bottom,0px))" : 20, zIndex: 210, width: 56, height: 56, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff", fontSize: 26, cursor: "pointer", boxShadow: "0 6px 20px rgba(79,70,229,0.45)" }}>{open ? "✕" : "💬"}</button>
      {open && (
        <div style={{ position: "fixed", right: isMobile ? 10 : 20, left: isMobile ? 10 : "auto", bottom: isMobile ? "calc(134px + env(safe-area-inset-bottom,0px))" : 86, zIndex: 210, width: isMobile ? "auto" : "min(400px, calc(100vw - 40px))", height: isMobile ? "calc(100dvh - 150px - env(safe-area-inset-bottom,0px))" : "min(600px, calc(100dvh - 120px))", background: "#fff", borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid #e5e7eb" }}>
          <div style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff", padding: "12px 16px" }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>🤖 Trợ lý tra cứu</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>Nhớ ngữ cảnh · so sánh · biểu đồ · giọng nói · tóm tắt tệp</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10, background: "#f8fafc" }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.who === "me" ? "flex-end" : "flex-start", maxWidth: "90%", background: m.who === "me" ? "#4f46e5" : "#fff", color: m.who === "me" ? "#fff" : "#374151", border: m.who === "me" ? "none" : "1px solid #e5e7eb", borderRadius: 12, padding: "8px 12px", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {m.text}
                {m.learnedFrom && <div style={{ marginTop: 4, fontSize: 11, color: "#7c3aed", fontStyle: "italic" }}>🧠 Hiểu theo câu đã học: "{m.learnedFrom}"</div>}
                {m.understood && <div style={{ marginTop: 3, fontSize: 10.5, color: "#9ca3af" }}>🎯 Hiểu: {m.understood}</div>}
                {m.viaAI && <div style={{ marginTop: 3, fontSize: 10.5, color: "#0891b2" }}>✨ Trả lời có hỗ trợ của AI</div>}
                {m.list && m.list.length > 0 && <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>{m.list.map((li, k) => <div key={k} style={{ fontSize: 12.5 }}>{li}</div>)}</div>}
                {m.bars && m.bars.length > 0 && barBlock(m.bars)}
                {m.spark && sparkBlock(m.spark)}
                {m.tasks && m.tasks.length > 0 && <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5 }}>{m.tasks.map(t => { const st = STATUS[t.status]; return (<div key={t.id} onClick={() => onOpenTask && onOpenTask(t)} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 9px", cursor: "pointer", background: "#f8fafc" }}><div style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>{t.title}</div><div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{t.dept} · {nm(t.eid)} · {fmtDate(t.deadline)} {st && <span style={{ color: st.col }}>· {st.label}</span>}</div></div>); })}</div>}
                {m.clarify && <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>{m.clarify.map(c => <button key={c} onClick={() => clarify(msgs[i - 1]?.text || "", c)} style={{ fontSize: 11.5, background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe", borderRadius: 14, padding: "3px 10px", cursor: "pointer" }}>{c}</button>)}</div>}
                {m.explain && (<div style={{ marginTop: 6 }}><button onClick={() => setShowExplain(s => ({ ...s, [i]: !s[i] }))} style={{ fontSize: 11.5, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}>🧮 {showExplain[i] ? "Ẩn cách tính" : "Vì sao điểm này?"}</button>{showExplain[i] && <div style={{ marginTop: 5, display: "flex", flexDirection: "column", gap: 3, background: "#fffdf5", border: "1px solid #fde68a", borderRadius: 8, padding: "7px 10px" }}>{m.explain.map((l, k) => <div key={k} style={{ fontSize: 11.5, color: "#78350f", lineHeight: 1.5 }}>• {l}</div>)}</div>}</div>)}
                {m.action === "create" && onCreate && <div style={{ marginTop: 8 }}><button onClick={() => { onCreate(); setOpen(false); }} style={{ fontSize: 12, background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 600 }}>➕ Mở form tạo việc</button></div>}
                {m.suggestions && <div style={{ marginTop: 8 }}><div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>Ý bạn là:</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{m.suggestions.map(s => <button key={s} onClick={() => send(s)} style={{ fontSize: 11.5, background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe", borderRadius: 14, padding: "3px 10px", cursor: "pointer" }}>{s}</button>)}</div></div>}
                {m.followups && <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>{m.followups.map(s => <button key={s} onClick={() => send(s)} style={{ fontSize: 11.5, background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 14, padding: "3px 10px", cursor: "pointer" }}>↪ {s}</button>)}</div>}
                {m.who === "bot" && (m.list || m.bars || m.tasks || m.profileEid) && (
                  <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    {m.profileEid && onOpenProfile && <button onClick={() => { onOpenProfile(m.profileEid); setOpen(false); }} style={{ fontSize: 11.5, color: "#4338ca", background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 8, padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}>👤 Xem chi tiết</button>}
                    {m.guide && onOpenHelp && <button onClick={() => { onOpenHelp(); setOpen(false); }} style={{ fontSize: 11.5, color: "#4338ca", background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 8, padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}>📘 Mở hướng dẫn</button>}
                    {!m.guide && (m.bars || m.tasks || m.list) && <button onClick={() => exportCsv(m)} style={{ fontSize: 11.5, color: "#15803d", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>⬇ CSV</button>}
                    <button onClick={() => copyMsg(m, i)} style={{ fontSize: 11.5, color: "#6b7280", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>{copied === i ? "✓ Đã sao chép" : "⧉ Sao chép"}</button>
                    {typeof window !== "undefined" && window.speechSynthesis && <button onClick={() => speak(m)} title="Đọc to" style={{ fontSize: 12.5, background: "none", border: "none", cursor: "pointer" }}>🔊</button>}
                  </div>
                )}
                {m.who === "bot" && m.q && (
                  <div style={{ marginTop: 8, borderTop: "1px dashed #eef2ff", paddingTop: 6 }}>
                    {reacted[i] === "done" ? (
                      <div style={{ fontSize: 11, color: "#16a34a" }}>✓ Cảm ơn, tôi đã ghi nhận để trả lời tốt hơn.</div>
                    ) : correcting === i ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ fontSize: 11.5, color: "#6b7280" }}>Bạn muốn hỏi điều gì? Viết lại giúp tôi hiểu:</div>
                        <input value={corrText} onChange={e => setCorrText(e.target.value)} onKeyDown={e => e.key === "Enter" && teach(i)} placeholder="VD: ai trễ nhiều nhất phòng HCTH tháng 7" autoFocus style={{ fontSize: 12.5, padding: "6px 10px", border: "1px solid #c7d2fe", borderRadius: 8, outline: "none" }} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => teach(i)} style={{ fontSize: 11.5, background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontWeight: 600 }}>Dạy trợ lý</button>
                          <button onClick={() => { setCorrecting(-1); setCorrText(""); }} style={{ fontSize: 11.5, background: "none", color: "#6b7280", border: "none", cursor: "pointer" }}>Hủy</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>Hữu ích?</span>
                        <button onClick={() => giveFeedback(i, 1)} title="Đúng ý" style={{ fontSize: 13, background: "none", border: "none", cursor: "pointer" }}>👍</button>
                        <button onClick={() => { setCorrecting(i); setCorrText(""); }} title="Chưa đúng — dạy lại" style={{ fontSize: 13, background: "none", border: "none", cursor: "pointer" }}>👎</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          {sugs.length > 0 && (
            <div style={{ borderTop: "1px solid #f3f4f6", maxHeight: 150, overflowY: "auto", background: "#fff" }}>
              {sugs.map(s => <div key={s} onMouseDown={e => { e.preventDefault(); setInput(s); setShowAc(false); }} style={{ padding: "7px 14px", fontSize: 12.5, cursor: "pointer", borderBottom: "1px solid #f8fafc", color: "#374151" }}>{s}</div>)}
            </div>
          )}
          {msgs.length <= 1 && topFreq().length > 0 && (
            <div style={{ borderTop: "1px solid #f3f4f6", background: "#fff", padding: "8px 12px" }}>
              <div style={{ fontSize: 10.5, color: "#9ca3af", marginBottom: 5 }}>⭐ Câu bạn hay hỏi</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{topFreq().map(s => <button key={s} onClick={() => send(s)} style={{ fontSize: 11.5, background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe", borderRadius: 14, padding: "3px 10px", cursor: "pointer" }}>{s}</button>)}</div>
            </div>
          )}
          <div style={{ padding: 10, borderTop: "1px solid #e5e7eb", display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={() => fileRef.current && fileRef.current.click()} title="Tải tệp PDF/Word để tóm tắt" style={{ background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe", borderRadius: 10, width: 36, height: 38, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>📎</button>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: "none" }} onChange={onFile} />
            {SR && <button onClick={startVoice} title="Hỏi bằng giọng nói" style={{ background: listening ? "#fee2e2" : "#eef2ff", color: listening ? "#b91c1c" : "#4338ca", border: "1px solid " + (listening ? "#fecaca" : "#c7d2fe"), borderRadius: 10, width: 36, height: 38, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>{listening ? "🔴" : "🎤"}</button>}
            <input value={input} onChange={e => { setInput(e.target.value); setShowAc(true); }} onKeyDown={e => { if (e.key === "Enter") send(); }} placeholder="Hỏi, tìm việc, hoặc 📎/🎤…" style={{ flex: 1, padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 13, minWidth: 0 }} />
            <button onClick={() => send()} style={{ background: "#4f46e5", color: "#fff", border: "none", borderRadius: 10, padding: "0 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>Gửi</button>
          </div>
        </div>
      )}
    </>
  );
}
