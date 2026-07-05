import React, { useState } from "react";
import { DEPT_COLOR, RATING, LATE_REASONS } from "../constants";
import { parseJSON, getFileIcon } from "../helpers";
import { ProgressBar, RatingBadge, Chip, PChip } from "./ui";

const IMG_EXT = ["jpg", "jpeg", "png", "gif", "webp"];
const isImageFile = name => IMG_EXT.includes((name || "").split(".").pop().toLowerCase());

export default function TaskModal({
  modal, setModal,
  isMobile, inp,
  currentUser,
  getEmp,
  canEditTask, canDeleteTask, canRate, canApprove, canForward, canSetLateReason, canUpdateProgress, canProposeExtension,
  canCreate,
  comments, commentText, setCommentText, commentFiles, setCommentFiles, commentLoading,
  addComment, uploadFiles, uploadingFiles,
  updateTask,
  toggleDone,
  openApproveModal, rejectCompletionRequest, remindApproval,
  openExtRequestModal, openExtApprove, openExtReject,
  rateTask, ratingNote, setRatingNote,
  setLateReasonFn, lateNote, setLateNote,
  openEditTask,
  setDeleteConfirm,
  setForwardModal, setForwardEid,
  loadComments,
}) {
  const [previewImg, setPreviewImg] = useState(null);
  if (!modal) return null;


  return (
    <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: isMobile ? "12px 8px" : 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 540, maxHeight: isMobile ? "95vh" : "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column" }}>
        {isMobile && <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}><div style={{ width: 36, height: 4, background: "#d1d5db", borderRadius: 4 }} /></div>}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Chi tiết</span>
            {modal.template_id && <span style={{ fontSize: 11, background: "#e0e7ff", color: "#4338ca", padding: "2px 8px", borderRadius: 8 }}>🔄 Định kỳ</span>}
          </div>
          <button onClick={() => setModal(null)} style={{ background: "#f3f4f6", border: "none", cursor: "pointer", fontSize: 18, color: "#374151", width: isMobile ? 36 : 28, height: isMobile ? 36 : 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ padding: 18, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{modal.title}</div>
          {modal.description && <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 14 }}>{modal.description}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13, marginBottom: 14 }}>
            {[
              ["Phòng ban", <span style={{ background: DEPT_COLOR[modal.dept] + "22", color: DEPT_COLOR[modal.dept], padding: "2px 7px", borderRadius: 8, fontSize: 12 }}>{modal.dept}</span>],
              ["Giao cho", <div>{getEmp(modal.eid)?.name || "–"}{canEditTask(modal) && (modal.viewed_at ? <div title={`Đã xem lúc ${modal.viewed_at}`} style={{ fontSize: 11, color: "#15803d", marginTop: 2 }}>👁️ Đã xem lúc {modal.viewed_at}</div> : <div style={{ fontSize: 11, color: "#b91c1c", marginTop: 2 }}>🔴 Chưa xem</div>)}</div>],
              ["Ưu tiên", <PChip p={modal.prio} />],
              ["Hạn chót", <span style={{ color: modal.status === "overdue" ? "#b91c1c" : "#111", fontWeight: modal.status === "overdue" ? 600 : 400 }}>{modal.deadline}</span>],
              ["Trạng thái", <Chip s={modal.status} />],
              ["Ngày tạo", modal.created || "–"],
            ].map(([k, v]) => (
              <div key={k}><div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>{k}</div><div>{v}</div></div>
            ))}
          </div>

          {!modal.completed && (modal.ext_proposed || canProposeExtension(modal)) && (
            <div style={{ marginBottom: 14, padding: "12px 14px", background: modal.ext_proposed ? "#eff6ff" : "#f8fafc", borderRadius: 10, border: "1px solid " + (modal.ext_proposed ? "#bfdbfe" : "#e5e7eb") }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: modal.ext_proposed ? "#1d4ed8" : "#374151", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>📅 Gia hạn deadline</div>
              {modal.ext_proposed ? (
                <>
                  <div style={{ fontSize: 12, color: "#1d4ed8" }}>{modal.ext_requested_by} đề xuất gia hạn đến <b>{modal.ext_proposed}</b> lúc {modal.ext_requested_at}</div>
                  {modal.ext_reason && <div style={{ fontSize: 12, color: "#1e3a8a", marginTop: 6, fontStyle: "italic", background: "#dbeafe", padding: "6px 10px", borderRadius: 6 }}>"{modal.ext_reason}"</div>}
                  {canApprove(modal) ? (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button onClick={() => openExtApprove(modal)} style={{ flex: 1, padding: "8px", background: "#059669", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>✅ Duyệt gia hạn</button>
                      <button onClick={() => openExtReject(modal)} style={{ flex: 1, padding: "8px", border: "1px solid #fca5a5", borderRadius: 8, background: "#fff0f0", color: "#dc2626", cursor: "pointer", fontSize: 13 }}>✖ Từ chối</button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>Chờ người giao việc duyệt</div>
                  )}
                </>
              ) : (
                <button onClick={() => openExtRequestModal(modal)} style={{ padding: "6px 12px", border: "1px solid #93c5fd", borderRadius: 7, background: "#eff6ff", color: "#1d4ed8", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📅 Đề xuất gia hạn</button>
              )}
            </div>
          )}

          {modal.forwarded_by && (
            <div style={{ marginBottom: 14, padding: "10px 14px", background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8", marginBottom: 8 }}>↪ Chuỗi giao việc</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
                {modal.created_by_name && <><span style={{ background: "#fff", border: "1px solid #bfdbfe", padding: "3px 10px", borderRadius: 20, color: "#1e40af" }}>👤 {modal.created_by_name} <span style={{ color: "#9ca3af", fontSize: 11 }}>(giao gốc)</span></span><span style={{ color: "#93c5fd" }}>→</span></>}
                <span style={{ background: "#fff", border: "1px solid #bfdbfe", padding: "3px 10px", borderRadius: 20, color: "#1e40af" }}>👤 {modal.forwarded_by} <span style={{ color: "#9ca3af", fontSize: 11 }}>(chuyển tiếp)</span></span>
                <span style={{ color: "#93c5fd" }}>→</span>
                <span style={{ background: "#dbeafe", border: "1px solid #93c5fd", padding: "3px 10px", borderRadius: 20, color: "#1e3a8a", fontWeight: 600 }}>👤 {getEmp(modal.eid)?.name || "–"} <span style={{ fontWeight: 400, fontSize: 11 }}>(thực hiện)</span></span>
              </div>
            </div>
          )}

          {parseJSON(modal.collab_eids, []).length > 0 && (
            <div style={{ marginBottom: 14, padding: "10px 14px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#15803d", marginBottom: 8 }}>👥 Phối hợp / Phụ trách</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: modal.collab_note ? 8 : 0 }}>
                {parseJSON(modal.collab_eids, []).map(id => {
                  const emp = getEmp(id);
                  return emp ? <span key={id} style={{ background: "#fff", border: "1px solid #bbf7d0", color: "#15803d", fontSize: 12, padding: "3px 10px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: DEPT_COLOR[emp.dept] || "#16a34a" }} />{emp.name} <span style={{ color: "#9ca3af", fontSize: 11 }}>({emp.dept})</span></span> : null;
                })}
              </div>
              {modal.collab_note && <div style={{ fontSize: 12, color: "#166534", background: "#dcfce7", padding: "6px 10px", borderRadius: 6 }}>📝 {modal.collab_note}</div>}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <ProgressBar value={modal.progress || 0} editable={!modal.completed && !modal.completion_requested && !!(canCreate || currentUser.employee_id === modal.eid || parseJSON(modal.collab_eids, []).includes(currentUser.employee_id))} onChange={async v => { if (v === 100) { toggleDone(modal); return; } await updateTask(modal.id, { progress: v }, `Cập nhật tiến độ: ${v}%`); setModal(t => ({ ...t, progress: v })); }} />
          </div>

          {modal.status === "pending_approval" && (
            <div style={{ marginBottom: 14, padding: "12px 14px", background: "#fffbeb", borderRadius: 10, border: "2px solid #fbbf24" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>📨 Đang chờ duyệt hoàn thành</div>
              <div style={{ fontSize: 12, color: "#92400e" }}>{modal.requested_by} yêu cầu duyệt lúc {modal.requested_at}</div>
              {modal.completion_note && <div style={{ fontSize: 12, color: "#78350f", marginTop: 6, fontStyle: "italic", background: "#fef3c7", padding: "6px 10px", borderRadius: 6 }}>"{modal.completion_note}"</div>}
              {modal.reminder_at && <div style={{ fontSize: 11.5, color: "#92400e", marginTop: 6 }}>🔔 Đã nhắc duyệt lúc {modal.reminder_at}</div>}
              {canApprove(modal) ? (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={() => { openApproveModal(modal); setModal(null); }} style={{ flex: 1, padding: "8px", background: "#059669", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>✅ Duyệt & đánh giá</button>
                  <button onClick={() => { rejectCompletionRequest(modal); setModal(null); }} style={{ flex: 1, padding: "8px", border: "1px solid #fca5a5", borderRadius: 8, background: "#fff0f0", color: "#dc2626", cursor: "pointer", fontSize: 13 }}>↩ Từ chối</button>
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>Chờ người giao việc duyệt</div>
                  {(currentUser?.employee_id === modal.eid || modal.requested_by === currentUser?.full_name) && (
                    <button onClick={() => remindApproval(modal)} style={{ marginTop: 8, padding: "6px 12px", border: "1px solid #fbbf24", borderRadius: 7, background: "#fff", color: "#92400e", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🔔 Nhắc duyệt</button>
                  )}
                </div>
              )}
            </div>
          )}

          {modal.status === "completed" && !modal.rating && canRate(modal) && (
            <div style={{ marginBottom: 10, padding: "10px 14px", background: "linear-gradient(135deg,#fef9c3,#fde68a)", borderRadius: 10, border: "2px solid #f59e0b", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>⭐</span>
              <div><div style={{ fontWeight: 700, fontSize: 12, color: "#92400e" }}>Bạn chưa đánh giá nhiệm vụ này!</div><div style={{ fontSize: 11, color: "#92400e", marginTop: 1 }}>Vui lòng đánh giá kết quả bên dưới để hoàn tất quy trình.</div></div>
            </div>
          )}

          {modal.status === "completed" && (
            <div style={{ marginBottom: 14, padding: "12px 14px", background: modal.rating ? "#f8fafc" : "#fffbeb", borderRadius: 10, border: "1px solid " + (modal.rating ? "#e5e7eb" : "#fde68a") }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>⭐ Đánh giá kết quả{modal.rating && <RatingBadge r={modal.rating} />}{modal.rated_by && <span style={{ fontSize: 11, color: "#9ca3af" }}>bởi {modal.rated_by}</span>}</div>
              {canRate(modal) && (<>
                <div style={{ display: "flex", gap: 8, marginBottom: modal.rating ? 0 : 8 }}>
                  {Object.entries(RATING).map(([key, r]) => (
                    <button key={key} onClick={() => rateTask(modal.id, key)} style={{ flex: 1, padding: "8px 6px", border: "2px solid " + (modal.rating === key ? r.col : "#e5e7eb"), borderRadius: 8, background: modal.rating === key ? r.bg : "#fff", cursor: "pointer", fontSize: 13, fontWeight: modal.rating === key ? 700 : 400, color: modal.rating === key ? r.col : "#6b7280", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}><span style={{ fontSize: 18 }}>{r.icon}</span>{r.label}</button>
                  ))}
                </div>
                {!modal.rating && <input value={ratingNote} onChange={e => setRatingNote(e.target.value)} placeholder="Ghi chú (không bắt buộc)..." style={inp} />}
                {modal.rating_note && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6, fontStyle: "italic" }}>"{modal.rating_note}"</div>}
              </>)}
              {!canRate(modal) && !modal.rating && <div style={{ fontSize: 12, color: "#9ca3af" }}>{modal.created_by_id ? "Chỉ người giao việc mới được đánh giá" : "Chờ lãnh đạo đánh giá"}</div>}
            </div>
          )}

          {(modal.status === "overdue" || (modal.late_reason && modal.late_reason !== "")) && (
            <div style={{ marginBottom: 14, padding: "12px 14px", background: "#fff5f5", borderRadius: 10, border: "1px solid #fca5a5" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#b91c1c", marginBottom: 8 }}>🔴 Nguyên nhân trễ hạn</div>
              {modal.late_reason ? (
                <div>
                  <div style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{LATE_REASONS.find(r => r.value === modal.late_reason)?.label}</div>
                  {modal.late_note && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, fontStyle: "italic" }}>"{modal.late_note}"</div>}
                  {canSetLateReason(modal) && <button onClick={() => { updateTask(modal.id, { late_reason: "", late_note: "" }, "Xóa nguyên nhân trễ"); setModal(m => ({ ...m, late_reason: "", late_note: "" })); }} style={{ marginTop: 8, fontSize: 11, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Thay đổi</button>}
                </div>
              ) : (
                canSetLateReason(modal) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {LATE_REASONS.map(r => <button key={r.value} onClick={() => setLateReasonFn(modal.id, r.value)} style={{ padding: "5px 12px", border: "1px solid #fca5a5", borderRadius: 20, background: "#fff", color: "#b91c1c", cursor: "pointer", fontSize: 12 }}>{r.label}</button>)}
                    </div>
                    <input value={lateNote} onChange={e => setLateNote(e.target.value)} placeholder="Ghi chú thêm..." style={inp} />
                  </div>
                )
              )}
              {!canSetLateReason(modal) && !modal.late_reason && <div style={{ fontSize: 12, color: "#9ca3af" }}>Nhân viên chưa khai báo</div>}
            </div>
          )}

          {parseJSON(modal.attachments, []).length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>📎 File đính kèm</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {parseJSON(modal.attachments, []).map((att, i) => (
                  isImageFile(att.name) ? (
                    <div key={i} onClick={() => setPreviewImg(att)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#f1f5f9", borderRadius: 8, cursor: "pointer", color: "#1e40af", fontSize: 13 }}>
                      <span style={{ fontSize: 18 }}>🖼️</span>
                      <span style={{ flex: 1, whiteSpace: "normal", wordBreak: "break-word" }}>{att.name}</span>
                      <span style={{ fontSize: 11, color: "#6b7280", flexShrink: 0 }}>👁️ Xem trước</span>
                    </div>
                  ) : (
                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#f1f5f9", borderRadius: 8, textDecoration: "none", color: "#1e40af", fontSize: 13 }}>
                      <span style={{ fontSize: 18 }}>{att.url && att.url.startsWith("http") && !att.url.includes("supabase") ? "🔗" : getFileIcon(att.name)}</span>
                      <span style={{ flex: 1, whiteSpace: "normal", wordBreak: "break-word" }}>{att.name}</span>
                      <span style={{ fontSize: 11, color: "#6b7280", flexShrink: 0 }}>{att.url && att.url.startsWith("http") && !att.url.includes("supabase") ? "↗" : "⬇"}</span>
                    </a>
                  )
                ))}
              </div>
            </div>
          )}

          {parseJSON(modal.history, []).length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>🔄 Lịch sử</div>
              <div style={{ maxHeight: 100, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                {parseJSON(modal.history, []).map((h, i) => (
                  <div key={i} style={{ fontSize: 12, padding: "5px 10px", background: "#f8fafc", borderRadius: 6, borderLeft: "3px solid #6366f1" }}>
                    <span style={{ color: "#4338ca", fontWeight: 500 }}>{h.action}</span><span style={{ color: "#9ca3af", marginLeft: 8 }}>— {h.by} · {h.at}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>💬 Bình luận ({(comments[modal.id] || []).length})</div>
            <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              {commentLoading && <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center" }}>Đang tải…</div>}
              {(comments[modal.id] || []).length === 0 && !commentLoading && <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 8 }}>Chưa có bình luận</div>}
              {(comments[modal.id] || []).map(c => {
                const d = new Date(c.created_at);
                const timeStr = isNaN(d) ? c.created_at : d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
                const files = parseJSON(c.attachments, []);
                return (
                  <div key={c.id} style={{ padding: "8px 12px", background: c.user_name === currentUser.full_name ? "#eef2ff" : "#f9fafb", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 12, color: c.user_name === currentUser.full_name ? "#4338ca" : "#374151" }}>{c.user_name}</span>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>{timeStr}</span>
                    </div>
                    {c.content && <div style={{ fontSize: 13 }}>{c.content}</div>}
                    {files.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>{files.map((f, i) => <a key={i} href={f.url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, padding: "3px 8px", fontSize: 11, color: "#4f46e5", textDecoration: "none" }}>📎 {f.name}</a>)}</div>}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {commentFiles.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {commentFiles.map((f, i) => <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: "#4338ca" }}>📎 {f.name}<button onClick={() => setCommentFiles(p => p.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 13, padding: 0 }}>✕</button></span>)}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 7, cursor: "pointer", background: "#f9fafb", fontSize: 14, flexShrink: 0 }} title="Đính kèm file">📎
                  <input type="file" multiple style={{ display: "none" }} disabled={uploadingFiles} onChange={async e => { const fl = Array.from(e.target.files); if (!fl.length) return; const up = await uploadFiles(fl, commentFiles); setCommentFiles(up); e.target.value = ""; }} />
                </label>
                <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && addComment(modal.id)} placeholder={uploadingFiles ? "Đang upload..." : "Bình luận… (Enter gửi)"} style={{ ...inp, flex: 1 }} />
                <button onClick={() => addComment(modal.id)} style={{ padding: "7px 14px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13 }}>Gửi</button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "12px 18px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", position: "sticky", bottom: 0, background: "#fff" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {modal.completed && canEditTask(modal) && <button onClick={() => { toggleDone(modal); setModal(null); }} style={{ padding: "7px 14px", border: "1px solid #d1d5db", borderRadius: 7, background: "#f9fafb", cursor: "pointer", fontSize: 12, color: "#6b7280" }}>↩ Bỏ HT</button>}
            {!modal.completed && !modal.completion_requested && canUpdateProgress(modal) && <button onClick={() => { toggleDone(modal); setModal(null); }} style={{ padding: "7px 14px", border: "1px solid #fbbf24", borderRadius: 7, background: "#fffbeb", cursor: "pointer", fontSize: 12, color: "#92400e", fontWeight: 600 }}>📨 Yêu cầu hoàn thành</button>}
            {canForward(modal) && <button onClick={() => { setForwardModal(modal); setForwardEid(""); setModal(null); }} style={{ padding: "7px 14px", border: "1px solid #93c5fd", borderRadius: 7, background: "#eff6ff", cursor: "pointer", fontSize: 12, color: "#1d4ed8" }}>↪ Chuyển tiếp</button>}
            {canEditTask(modal) && <button onClick={() => { openEditTask(modal); setModal(null); }} style={{ padding: "7px 14px", border: "1px solid #d1d5db", borderRadius: 7, background: "#f9fafb", cursor: "pointer", fontSize: 12 }}>✏️</button>}
          </div>
          {canDeleteTask(modal) && <button onClick={() => { setDeleteConfirm(modal.id); setModal(null); }} style={{ padding: "7px 14px", border: "1px solid #fca5a5", borderRadius: 7, background: "#fff0f0", cursor: "pointer", fontSize: 12, color: "#dc2626" }}>🗑️ Xóa</button>}
        </div>
      </div>

      {previewImg && (
        <div onClick={e => { e.stopPropagation(); setPreviewImg(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: 900, marginBottom: 10 }}>
            <span style={{ color: "#fff", fontSize: 13 }}>{previewImg.name}</span>
            <div style={{ display: "flex", gap: 12 }}>
              <a href={previewImg.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: "#fff", fontSize: 13, textDecoration: "underline" }}>⬇ Tải về</a>
              <button onClick={() => setPreviewImg(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#fff", lineHeight: 1 }}>✕</button>
            </div>
          </div>
          <img src={previewImg.url} alt={previewImg.name} onClick={e => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 8, objectFit: "contain" }} />
        </div>
      )}
    </div>
  );
}
