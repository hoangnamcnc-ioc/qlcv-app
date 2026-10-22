import React, { useState, useMemo } from "react";
import { aiEnabled, aiTaskDraft } from "../aiIntent";
import { suggestDuration, suggestDeadline } from "../deadlineSuggest";
import { fmtDate } from "../helpers";

// Hỗ trợ thông minh trong form TẠO VIỆC:
//  1) "✨ AI soạn nháp": từ tiêu đề ngắn hoặc tin chỉ đạo/email dán vào → điền sẵn tiêu đề, mô tả, hạn, ưu tiên, các bước (checklist).
//  2) "💡 Gợi ý hạn chót": thống kê từ các việc tương tự đã làm xong (KHÔNG dùng AI) → hạn đề xuất 1 chạm.
export default function TaskAIAssist({ taskForm, setTaskForm, todayStr, deadlineEditable, pool, inp }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const data = taskForm?.data || {};
  const isNew = !taskForm?.editId;

  const sug = useMemo(() => (isNew ? suggestDuration(data.title, pool) : null), [isNew, data.title, pool]);
  const sugDate = sug ? suggestDeadline(todayStr, sug.days) : null;

  const run = async () => {
    const src = text.trim() || (data.title || "").trim();
    if (!src) { setMsg("Hãy nhập tiêu đề ở trên, hoặc dán nội dung chỉ đạo vào ô này."); return; }
    setBusy(true); setMsg("");
    const d = await aiTaskDraft(src, todayStr);
    setBusy(false);
    if (!d) { setMsg("AI chưa soạn được (mạng chậm hoặc dịch vụ bận). Bạn thử lại sau hoặc nhập tay nhé."); return; }
    const pasted = !!text.trim();
    setTaskForm(f => {
      const nd = { ...f.data };
      if (d.title && (pasted || !nd.title.trim())) nd.title = d.title;
      if (d.description) nd.description = d.description;
      nd.prio = d.prio;
      if (d.deadline && deadlineEditable && isNew) nd.deadline = d.deadline;
      if (isNew && d.subtasks.length) nd.checklist = JSON.stringify(d.subtasks.map(t => ({ text: t, done: false })));
      return { ...f, data: nd };
    });
    setMsg(`✅ Đã điền nháp${d.subtasks.length ? ` kèm ${d.subtasks.length} bước thực hiện` : ""}${d.deadline && deadlineEditable && isNew ? " và hạn chót" : ""} — vui lòng kiểm tra lại trước khi lưu.`);
  };

  return (
    <>
      {aiEnabled && (
        <div style={{ border: "1px dashed #a5b4fc", background: "#f5f3ff", borderRadius: 8, padding: "8px 12px" }}>
          <button type="button" onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: "#4338ca", fontWeight: 600, fontSize: 13, padding: 0 }}>✨ AI soạn nháp {open ? "▲" : "▼"}</button>
          {open && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Dán tin nhắn chỉ đạo / email / nội dung công văn vào đây… Hoặc để trống để AI soạn từ tiêu đề đã nhập." style={{ ...inp, resize: "vertical", fontSize: 12.5 }} />
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" onClick={run} disabled={busy} style={{ padding: "6px 14px", border: "none", borderRadius: 7, background: busy ? "#c7d2fe" : "#4f46e5", color: "#fff", cursor: busy ? "default" : "pointer", fontSize: 12.5, fontWeight: 600 }}>{busy ? "⏳ AI đang soạn…" : "Soạn nháp"}</button>
                <span style={{ fontSize: 11, color: "#6b7280" }}>Nội dung bạn dán sẽ được gửi tới dịch vụ AI để soạn — đừng dán thông tin mật.</span>
              </div>
            </div>
          )}
          {msg && <div style={{ marginTop: 6, fontSize: 12, color: msg.startsWith("✅") ? "#15803d" : "#b45309" }}>{msg}</div>}
        </div>
      )}
      {sug && sugDate && deadlineEditable && (
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#075985", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span>💡 {sug.n} việc tương tự trước đây thường hoàn thành sau <b>~{sug.days} ngày</b> → hạn gợi ý <b>{fmtDate(sugDate)}</b></span>
          {data.deadline !== sugDate && <button type="button" onClick={() => setTaskForm(f => ({ ...f, data: { ...f.data, deadline: sugDate } }))} style={{ padding: "3px 10px", border: "1px solid #7dd3fc", borderRadius: 6, background: "#fff", color: "#0369a1", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Dùng hạn này</button>}
        </div>
      )}
    </>
  );
}
