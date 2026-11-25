import { useState, useEffect } from "react";

// Hộp thoại xác nhận / nhập liệu bằng TIẾNG VIỆT thay cho window.confirm / window.prompt của trình duyệt
// (nút OK/Cancel của trình duyệt hiện chữ theo ngôn ngữ trình duyệt). Dùng bất đồng bộ:
//   if (!(await askConfirm("Xóa?"))) return;      const v = await askPrompt("Nhập mật khẩu:", "", { password: true });
let host = null;
const queue = [];
const open = req => new Promise(resolve => { const item = { ...req, resolve }; if (host) host(item); else queue.push(item); });
export const askConfirm = (message, opts = {}) => open({ kind: "confirm", message, ...opts });
export const askAlert = message => open({ kind: "confirm", message, single: true, okText: "Đã hiểu" });
// Trả về chuỗi người dùng nhập, hoặc null nếu bấm Hủy (giống window.prompt)
export const askPrompt = (message, defaultValue = "", opts = {}) => open({ kind: "prompt", message, defaultValue, ...opts });

export function DialogHost() {
  const [cur, setCur] = useState(null);
  const [val, setVal] = useState("");
  const [pending, setPending] = useState([]);
  useEffect(() => {
    host = item => setPending(p => [...p, item]);
    queue.splice(0).forEach(item => host(item));
    return () => { host = null; };
  }, []);
  useEffect(() => { if (!cur && pending.length) { const [n, ...rest] = pending; setCur(n); setVal(n.defaultValue || ""); setPending(rest); } }, [cur, pending]);
  if (!cur) return null;
  const done = v => { const c = cur; setCur(null); c.resolve(v); };
  const ok = () => done(cur.kind === "prompt" ? val : true);
  const cancel = () => done(cur.kind === "prompt" ? null : false);
  return (
    <div onKeyDown={e => { if (e.key === "Escape") cancel(); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16 }}>
      <div role="dialog" aria-modal="true" style={{ background: "#fff", color: "#111", borderRadius: 14, maxWidth: 460, width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,0.3)", overflow: "hidden" }}>
        <div style={{ padding: "18px 20px 6px", fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{cur.message}</div>
        {cur.kind === "prompt" && (
          <div style={{ padding: "6px 20px" }}>
            <input autoFocus type={cur.password ? "password" : "text"} value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") ok(); }}
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }} />
          </div>
        )}
        <div style={{ padding: "12px 20px 16px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {!cur.single && <button onClick={cancel} style={{ padding: "8px 16px", border: "1px solid #d1d5db", borderRadius: 8, background: "#f9fafb", fontSize: 13.5, cursor: "pointer" }}>{cur.cancelText || "Hủy"}</button>}
          <button autoFocus={cur.kind === "confirm"} onClick={ok} style={{ padding: "8px 18px", border: "none", borderRadius: 8, background: cur.danger ? "#dc2626" : "#4f46e5", color: "#fff", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>{cur.okText || "Đồng ý"}</button>
        </div>
      </div>
    </div>
  );
}
