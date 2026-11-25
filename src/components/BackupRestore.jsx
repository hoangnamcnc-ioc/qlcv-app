import { useState } from "react";
import { encryptText, decryptText, isEncryptedBackup } from "../backupCrypto";
import { askConfirm } from "../dialog";

const stamp = () => { const d = new Date(); const p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };
const save = (text, name, type = "application/json") => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); };
const csvCell = v => { if (v == null) return ""; const s = typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const toCsv = rows => { const cols = [...new Set(rows.flatMap(r => Object.keys(r)))]; return "﻿" + [cols.join(","), ...rows.map(r => cols.map(c => csvCell(r[c])).join(","))].join("\r\n"); };
const TABLE_LABEL = { departments: "Phòng/Ban", employees: "Nhân viên (kèm hồ sơ)", users: "Tài khoản (kèm mật khẩu đã băm)", tasks: "Nhiệm vụ", comments: "Bình luận", recurring_templates: "Mẫu việc định kỳ", other_tasks: "Việc khác", support_cases: "Hỗ trợ người dùng", projects: "Dự án ngân sách", documents: "Văn bản", approval_delegations: "Ủy quyền duyệt", monthly_scores: "Sổ điểm đã chốt", kpi_common: "Điểm tiêu chí chung", kpi_catalog: "Danh mục sản phẩm chuẩn", app_config: "Cấu hình chung", duty_schedule: "Lịch trực", chat_channels: "Kênh chat", chat_messages: "Tin nhắn chat", chat_learning: "Mẫu học của trợ lý", feedback: "Góp ý", login_history: "Lịch sử đăng nhập" };

async function callApi(path, payload) {
  const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  let d = null; try { d = await r.json(); } catch { /* không phải JSON */ }
  if (!r.ok) throw new Error(d?.error || `Máy chủ trả lỗi ${r.status}` + (r.status === 404 ? " (chưa cài chức năng này trên máy chủ)" : r.status === 413 ? " (tệp quá lớn)" : ""));
  return d;
}

// Tab "Sao lưu & Khôi phục" (Admin/Giám đốc): tải toàn bộ dữ liệu về máy (JSON, có thể mã hóa), xuất CSV từng bảng, nạp lại từ tệp.
export default function BackupRestore({ currentUser, card, inp }) {
  const [pw, setPw] = useState(""), [pass, setPass] = useState(""), [busy, setBusy] = useState(""), [msg, setMsg] = useState(null);
  const [last, setLast] = useState(null); // bản sao lưu vừa tải (để xuất CSV từng bảng)
  const [file, setFile] = useState(null), [parsed, setParsed] = useState(null), [mode, setMode] = useState("merge"), [confirm, setConfirm] = useState("");
  const [fpass, setFpass] = useState("");
  const note = (t, ok = true) => setMsg({ t, ok });
  const me = currentUser?.username;

  const doBackup = async (silentName) => {
    const data = await callApi("/api/backup", { username: me, password: pw });
    const text = JSON.stringify(data);
    const out = pass ? await encryptText(text, pass) : text;
    save(out, `${silentName || "qlcv-sao-luu"}-${stamp()}.json`);
    return data;
  };
  const onBackup = async () => {
    if (!pw) return note("Nhập mật khẩu đăng nhập của bạn để xác nhận", false);
    setBusy("backup"); setMsg(null);
    try { const d = await doBackup(); setLast(d); note(`Đã tải bản sao lưu: ${Object.values(d.counts).reduce((a, b) => a + b, 0)} dòng ở ${Object.keys(d.counts).length} bảng${pass ? " (đã mã hóa)" : " (CHƯA mã hóa — hãy cất giữ cẩn thận)"}.`); }
    catch (e) { note(e.message, false); } finally { setBusy(""); }
  };
  const onFile = async f => {
    setFile(f); setParsed(null); setMsg(null);
    if (!f) return;
    try {
      let o = JSON.parse(await f.text());
      if (isEncryptedBackup(o)) { if (!fpass) { setParsed({ needPass: true }); return; } o = JSON.parse(await decryptText(o, fpass)); }
      setParsed({ backup: o });
    } catch (e) { note("Không đọc được tệp: " + e.message, false); }
  };
  const unlock = async () => { await onFile(file); };
  const check = async () => {
    setBusy("check"); setMsg(null);
    try { const d = await callApi("/api/restore", { username: me, password: pw, dry: true, backup: parsed.backup }); setParsed(p => ({ ...p, counts: d.counts })); note("Tệp hợp lệ. Xem số dòng từng bảng bên dưới."); }
    catch (e) { note(e.message, false); } finally { setBusy(""); }
  };
  const restore = async () => {
    if (confirm !== "KHOI PHUC") return note('Gõ đúng chữ KHOI PHUC để xác nhận', false);
    if (!(await askConfirm(mode === "replace" ? "THAY THẾ: dữ liệu hiện tại của các bảng trong tệp sẽ bị XÓA rồi nạp lại từ tệp. Hệ thống sẽ tự tải về một bản sao lưu hiện tại trước. Tiếp tục?" : "TRỘN: thêm/cập nhật dữ liệu từ tệp, không xóa gì. Tiếp tục?", { danger: mode === "replace" }))) return;
    setBusy("restore"); setMsg(null);
    try {
      if (mode === "replace") await doBackup("qlcv-truoc-khi-khoi-phuc"); // tự lưu bản hiện tại phòng khi nạp nhầm
      const d = await callApi("/api/restore", { username: me, password: pw, mode, confirm, backup: parsed.backup });
      note(`Đã khôi phục (${mode === "replace" ? "thay thế" : "trộn"}): ${Object.values(d.restored).reduce((a, b) => a + b, 0)} dòng. Tải lại trang để thấy dữ liệu mới.`);
      setTimeout(() => window.location.reload(), 3500);
    } catch (e) { note(e.message + " — dữ liệu có thể đã nạp một phần; hãy dùng bản sao lưu vừa tải để khôi phục lại.", false); } finally { setBusy(""); }
  };

  const lab = { fontSize: 12, color: "#6b7280", display: "block", marginBottom: 3 };
  const btn = (bg, dis) => ({ padding: "9px 16px", border: "none", borderRadius: 8, background: dis ? "#c7d2fe" : bg, color: "#fff", fontWeight: 600, fontSize: 13, cursor: dis ? "default" : "pointer" });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...card, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>💾 Sao lưu toàn bộ dữ liệu</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
          Tải về một tệp JSON gồm <b>mọi bảng</b>: nhân viên (kèm hồ sơ), tài khoản (mật khẩu đã băm), nhiệm vụ, bình luận, điểm, văn bản, lịch trực, danh mục… Chưa gồm <b>file đính kèm</b> (nằm trong kho file; trên máy chủ riêng đã có sao lưu hằng đêm).
          Tệp có dữ liệu nhạy cảm — <b>nên đặt mật khẩu mã hóa</b> và cất nơi an toàn.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
          <div><label style={lab}>Mật khẩu đăng nhập của bạn (xác nhận)</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} style={inp} autoComplete="current-password" /></div>
          <div><label style={lab}>Mật khẩu mã hóa tệp (không bắt buộc)</label><input type="password" value={pass} onChange={e => setPass(e.target.value)} style={inp} autoComplete="new-password" placeholder="Nhớ kỹ — mất thì không giải mã được" /></div>
        </div>
        <div style={{ marginTop: 10 }}><button onClick={onBackup} disabled={busy === "backup"} style={btn("#4f46e5", busy === "backup")}>{busy === "backup" ? "Đang tải…" : "⬇ Tải bản sao lưu (JSON)"}</button></div>
        {last && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Xuất từng bảng ra Excel (CSV) từ bản vừa tải:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(last.counts).map(([t, n]) => (
                <button key={t} onClick={() => save(toCsv(last.tables[t]), `${t}-${stamp()}.csv`, "text/csv;charset=utf-8")} disabled={!n} title={t} style={{ padding: "5px 10px", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", fontSize: 12, cursor: n ? "pointer" : "default", opacity: n ? 1 : 0.5 }}>
                  {TABLE_LABEL[t] || t} <span style={{ color: "#9ca3af" }}>({n})</span> ⬇
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Cột tài khoản/hồ sơ nhạy cảm cũng nằm trong CSV — cất giữ cẩn thận.</div>
          </div>
        )}
      </div>

      <div style={{ ...card, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>♻️ Khôi phục từ tệp sao lưu</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
          <b>Trộn</b>: thêm/cập nhật theo mã, <u>không xóa</u> dòng nào (an toàn, dùng khi gộp dữ liệu hoặc nạp lại phần bị mất).
          <b> Thay thế</b>: xóa sạch các bảng có trong tệp rồi nạp lại đúng như tệp (dùng khi dựng máy chủ mới hoặc quay về một thời điểm); hệ thống tự tải về bản hiện tại trước khi thay thế.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
          <div><label style={lab}>Tệp sao lưu (.json)</label><input type="file" accept=".json,application/json" onChange={e => onFile(e.target.files?.[0] || null)} style={{ fontSize: 12 }} /></div>
          <div><label style={lab}>Mật khẩu mã hóa của tệp (nếu có)</label><input type="password" value={fpass} onChange={e => setFpass(e.target.value)} style={inp} />{parsed?.needPass && <button onClick={unlock} style={{ marginTop: 4, padding: "4px 10px", border: "1px solid #c7d2fe", borderRadius: 6, background: "#eef2ff", fontSize: 12, cursor: "pointer" }}>🔓 Mở tệp</button>}</div>
        </div>
        {parsed?.needPass && <div style={{ fontSize: 12, color: "#b45309", marginTop: 6 }}>Tệp đã mã hóa — nhập mật khẩu mã hóa rồi bấm "Mở tệp".</div>}
        {parsed?.backup && (
          <div style={{ marginTop: 10, fontSize: 12.5 }}>
            Tệp xuất lúc <b>{String(parsed.backup.exported_at || "").replace("T", " ").slice(0, 16)}</b> bởi <b>{parsed.backup.exported_by || "?"}</b> — {Object.keys(parsed.backup.tables || {}).length} bảng.
            {parsed.counts && <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>{Object.entries(parsed.counts).map(([t, n]) => <span key={t} style={{ background: "#f1f5f9", borderRadius: 6, padding: "2px 8px", fontSize: 11.5 }}>{TABLE_LABEL[t] || t}: <b>{n}</b></span>)}</div>}
            <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
              <label><input type="radio" checked={mode === "merge"} onChange={() => setMode("merge")} /> Trộn (an toàn)</label>
              <label><input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} /> <b style={{ color: "#b91c1c" }}>Thay thế</b></label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, marginTop: 10 }}>
              <div><label style={lab}>Mật khẩu đăng nhập của bạn</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} style={inp} /></div>
              <div><label style={lab}>Gõ <b>KHOI PHUC</b> để xác nhận</label><input value={confirm} onChange={e => setConfirm(e.target.value)} style={inp} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button onClick={check} disabled={!pw || busy === "check"} style={btn("#0ea5e9", !pw || busy === "check")}>🔍 Kiểm tra tệp</button>
              <button onClick={restore} disabled={!pw || confirm !== "KHOI PHUC" || busy === "restore"} style={btn(mode === "replace" ? "#dc2626" : "#4f46e5", !pw || confirm !== "KHOI PHUC" || busy === "restore")}>{busy === "restore" ? "Đang khôi phục…" : mode === "replace" ? "♻️ Khôi phục (THAY THẾ)" : "♻️ Khôi phục (trộn)"}</button>
            </div>
          </div>
        )}
      </div>
      {msg && <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: 13, background: msg.ok ? "#f0fdf4" : "#fef2f2", color: msg.ok ? "#166534" : "#b91c1c", border: "1px solid " + (msg.ok ? "#bbf7d0" : "#fecaca") }}>{msg.t}</div>}
    </div>
  );
}
