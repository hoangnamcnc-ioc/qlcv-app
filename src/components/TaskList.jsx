import React, { useState } from "react";
import { DEPTS, DEPT_COLOR, RATING } from "../constants";
import { RatingBadge, Chip, PChip } from "./ui";
import { pendingApprovalDays } from "../helpers";

// Cảnh báo khi 1 yêu cầu duyệt hoàn thành bị "ngâm" quá lâu — để BGĐ/Trưởng phòng biết ai đang duyệt chậm,
// không đổ lỗi trễ hạn lên nhân viên đã yêu cầu duyệt đúng hạn.
const PendingApprovalWarning = ({ t }) => {
  const days = pendingApprovalDays(t);
  if (t.status !== "pending_approval" || days < 2) return null;
  return <span title={`Đã yêu cầu duyệt ${days} ngày, chưa được xử lý`} style={{ background: "#fef2f2", color: "#b91c1c", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 8, border: "1px solid #fecaca" }}>⏳ Chờ duyệt {days} ngày</span>;
};

export default function TaskList({
  isMobile, inp,
  search, setSearch,
  dateFrom, setDateFrom, dateTo, setDateTo,
  fStatus, setFStatus,
  fDept, setFDept,
  fEid, setFEid,
  fSort, setFSort,
  filtered, paged, page, setPage, totalPages,
  canSeeAll, canCreate, canEditTask, canDeleteTask, canUpdateProgress, canRate, canApprove,
  employees, userDept,
  getEmp,
  setModal, loadComments,
  openEditTask, toggleDone,
  setDeleteConfirm,
  rateTask, ratingNote, setRatingNote,
  quickRate, setQuickRate,
  quickProgress, setQuickProgress,
  updateTask,
  myNewTaskIds,
  onCompleteRequest,
  openApproveModal, rejectCompletionRequest, remindApproval, currentUser,
}) {
  const [pendingQuickRating, setPendingQuickRating] = useState(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "10px 12px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Tìm theo tên việc, mô tả, người thực hiện, số văn bản..." style={{ ...inp, flex: 1, minWidth: 160 }} />
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ ...inp, width: "auto", padding: "6px 8px", fontSize: 12 }}>
          <option value="all">Tất cả TT</option><option value="on_time">Trong hạn</option><option value="nearly_due">Sắp HH</option><option value="overdue">Quá hạn</option><option value="pending_approval">Chờ duyệt</option><option value="completed_late">HT quá hạn</option><option value="completed">Hoàn thành</option>
        </select>
        {canSeeAll && <select value={fDept} onChange={e => setFDept(e.target.value)} style={{ ...inp, width: "auto", padding: "6px 8px", fontSize: 12 }}><option value="all">Tất cả phòng</option>{DEPTS.map(d => <option key={d} value={d}>{d}</option>)}</select>}
        {canCreate && <select value={fEid} onChange={e => setFEid(e.target.value)} style={{ ...inp, width: "auto", padding: "6px 8px", fontSize: 12 }}><option value="all">Tất cả NV</option>{(employees || []).filter(e => canSeeAll || e.dept === userDept).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>}
        <select value={fSort} onChange={e => setFSort(e.target.value)} style={{ ...inp, width: "auto", padding: "6px 8px", fontSize: 12, borderColor: "#6366f1", color: "#4f46e5", fontWeight: 500 }}>
          <option value="urgency">⚡ Ưu tiên</option><option value="deadline_asc">📅 Hạn gần nhất</option><option value="deadline_desc">📅 Hạn xa nhất</option><option value="newest">🆕 Mới nhất</option>
        </select>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>{filtered.length}</span>
      </div>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "10px 12px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>📅 Hạn chót:</span>
        <span style={{ fontSize: 12, color: "#6b7280" }}>Từ ngày</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inp, width: "auto" }} />
        <span style={{ fontSize: 12, color: "#6b7280" }}>Đến ngày</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inp, width: "auto" }} />
        {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{ padding: "5px 10px", border: "1px solid #d1d5db", borderRadius: 7, background: "#f9fafb", cursor: "pointer", fontSize: 12, color: "#6b7280" }}>✕ Bỏ lọc ngày</button>}
      </div>

      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {paged.map(t => (
            <div key={t.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              {/* Header — click để mở modal */}
              <div onClick={() => { setModal(t); loadComments(t.id); }} style={{ padding: "10px 12px", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 8 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, flex: 1, lineHeight: 1.4 }}>
                    {t.template_id && "🔄 "}
                    {myNewTaskIds.has(t.id) && <span style={{ background: "#dc2626", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 8, marginRight: 5, verticalAlign: "middle" }}>MỚI</span>}
                    {t.suspicious_completion && <span style={{ background: "#fff7ed", color: "#c2410c", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 8, marginRight: 5, verticalAlign: "middle", border: "1px solid #fed7aa" }}>🚨 ĐỘT NGỘT</span>}
                    {t.title}
                  </div>
                  <Chip s={t.status} />
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 7, alignItems: "center" }}>
                  <PendingApprovalWarning t={t} />
                  <span style={{ background: DEPT_COLOR[t.dept] + "22", color: DEPT_COLOR[t.dept], fontSize: 11, padding: "2px 7px", borderRadius: 8 }}>{t.dept}</span>
                  <PChip p={t.prio} />
                  <span style={{ fontSize: 11, color: "#6b7280" }}>{getEmp(t.eid)?.name || "–"}</span>
                  <span style={{ fontSize: 11, color: t.status === "overdue" ? "#b91c1c" : "#6b7280", fontWeight: t.status === "overdue" ? 600 : 400 }}>📅 {t.deadline}</span>
                  {t.rating && <RatingBadge r={t.rating} />}
                  {canEditTask(t) && !t.completed && (t.viewed_at
                    ? <span title={`Đã xem lúc ${t.viewed_at}`} style={{ fontSize: 11, background: "#dcfce7", color: "#15803d", padding: "2px 7px", borderRadius: 8 }}>👁️ Đã xem</span>
                    : <span style={{ fontSize: 11, background: "#fef2f2", color: "#b91c1c", padding: "2px 7px", borderRadius: 8 }}>🔴 Chưa xem</span>)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 5, background: "#e5e7eb", borderRadius: 5, overflow: "hidden" }}><div style={{ height: "100%", width: (t.progress || 0) + "%", background: t.progress === 100 ? "#16a34a" : t.progress >= 50 ? "#f59e0b" : "#6366f1", borderRadius: 5 }} /></div>
                  <span style={{ fontSize: 11, color: "#6b7280", flexShrink: 0 }}>{t.progress || 0}%</span>
                </div>
              </div>
              {/* Action bar */}
              <div style={{ borderTop: "1px solid #f3f4f6", padding: "6px 10px", display: "flex", gap: 6, background: "#fafafa", flexWrap: "wrap" }}>
                {t.completed && canEditTask(t) && <button onClick={() => toggleDone(t)} style={{ flex: 1, padding: "5px 0", border: "1px solid #d1d5db", borderRadius: 6, background: "#f9fafb", cursor: "pointer", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>↩ Bỏ HT</button>}
                {!t.completed && !t.completion_requested && canUpdateProgress(t) && <button onClick={() => toggleDone(t)} style={{ flex: 1, padding: "5px 0", border: "1px solid #fbbf24", borderRadius: 6, background: "#fffbeb", cursor: "pointer", fontSize: 12, color: "#92400e", fontWeight: 600 }}>📨 YC hoàn thành</button>}
                {t.completion_requested && canApprove(t) && (<>
                  <button onClick={() => openApproveModal(t)} style={{ flex: 1, padding: "5px 0", border: "1px solid #16a34a", borderRadius: 6, background: "#f0fdf4", cursor: "pointer", fontSize: 12, color: "#15803d", fontWeight: 600 }}>✅ Duyệt</button>
                  <button onClick={() => rejectCompletionRequest(t)} style={{ flex: 1, padding: "5px 0", border: "1px solid #fca5a5", borderRadius: 6, background: "#fff0f0", cursor: "pointer", fontSize: 12, color: "#dc2626" }}>↩ Từ chối</button>
                </>)}
                {t.completion_requested && !canApprove(t) && (
                  (currentUser?.employee_id === t.eid || t.requested_by === currentUser?.full_name) ? (
                    <button onClick={() => remindApproval(t)} style={{ flex: 1, padding: "5px 0", border: "1px solid #fbbf24", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 12, color: "#92400e", fontWeight: 600 }}>{t.reminder_at ? "🔔 Đã nhắc" : "🔔 Nhắc duyệt"}</button>
                  ) : <span style={{ flex: 1, padding: "5px 0", textAlign: "center", fontSize: 12, color: "#92400e" }}>⏳ Chờ duyệt</span>
                )}
                {canUpdateProgress(t) && !t.completed && !t.completion_requested && (
                  <button onClick={() => setQuickProgress(t.id)} style={{ flex: 1, padding: "5px 0", border: "1px solid #e0e7ff", borderRadius: 6, background: "#eef2ff", cursor: "pointer", fontSize: 12, color: "#4f46e5", fontWeight: 600 }}>% TĐ</button>
                )}
                {canRate(t) && t.status === "completed" && (
                  <button onClick={() => { setQuickRate(t.id); setPendingQuickRating(null); setRatingNote(""); }} style={{ flex: 1, padding: "5px 0", border: "1px solid #fde68a", borderRadius: 6, background: "#fef9c3", cursor: "pointer", fontSize: 12, color: "#92400e", fontWeight: 600 }}>⭐ ĐG</button>
                )}
                {canEditTask(t) && <button onClick={() => openEditTask(t)} style={{ padding: "5px 10px", border: "1px solid #d1d5db", borderRadius: 6, background: "#f9fafb", cursor: "pointer", fontSize: 13 }}>✏️</button>}
                <button onClick={() => { setModal(t); loadComments(t.id); }} style={{ padding: "5px 10px", border: "1px solid #d1d5db", borderRadius: 6, background: "#f9fafb", cursor: "pointer", fontSize: 13 }}>💬</button>
                {canDeleteTask(t) && <button onClick={() => setDeleteConfirm(t.id)} style={{ padding: "5px 10px", border: "1px solid #fca5a5", borderRadius: 6, background: "#fff0f0", cursor: "pointer", fontSize: 13, color: "#dc2626" }}>🗑️</button>}
              </div>
              {/* Quick progress popup */}
              {quickProgress === t.id && (
                <div style={{ padding: 10, borderTop: "1px solid #e5e7eb", background: "#fff", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[0,10,20,30,40,50,60,70,80,90,100].map(v => {
                    const a = (t.progress || 0) === v;
                    return <button key={v} onClick={async () => { if(v===100){setQuickProgress(null);onCompleteRequest(t);return;} await updateTask(t.id,{progress:v},"Cập nhật tiến độ: "+v+"%");setQuickProgress(null); }} style={{ padding: "5px 10px", border: "1.5px solid "+(a?"#4f46e5":"#e5e7eb"), borderRadius: 6, background: a?"#eef2ff":"#fff", cursor: "pointer", fontSize: 12, fontWeight: a?700:400, color: a?"#4f46e5":"#374151" }}>{v}%</button>;
                  })}
                  <button onClick={() => setQuickProgress(null)} style={{ padding: "5px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#f9fafb", cursor: "pointer", fontSize: 12, color: "#9ca3af" }}>Hủy</button>
                </div>
              )}
              {/* Quick rate popup */}
              {quickRate === t.id && (
                <div style={{ padding: 10, borderTop: "1px solid #e5e7eb", background: "#fff", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {Object.entries(RATING).map(([key,r]) => (
                      <button key={key} onClick={() => setPendingQuickRating(key)} style={{ padding: "6px 12px", border: "2px solid "+(pendingQuickRating===key?r.col:"#e5e7eb"), borderRadius: 7, background: pendingQuickRating===key?r.bg:"#fff", cursor: "pointer", fontSize: 12, fontWeight: pendingQuickRating===key?700:400, color: pendingQuickRating===key?r.col:"#374151" }}>{r.icon} {r.label}</button>
                    ))}
                    <button onClick={() => { setQuickRate(null); setPendingQuickRating(null); setRatingNote(""); }} style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 7, background: "#f9fafb", cursor: "pointer", fontSize: 12, color: "#9ca3af" }}>✕</button>
                  </div>
                  {pendingQuickRating && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input value={ratingNote} onChange={e => setRatingNote(e.target.value)} placeholder={["tb","kem"].includes(pendingQuickRating) ? "Nhận xét (bắt buộc, tối thiểu 10 ký tự)..." : "Nhận xét (không bắt buộc)..."} style={{ ...inp, flex: 1 }} />
                      <button onClick={() => { rateTask(t.id, pendingQuickRating); setQuickRate(null); setPendingQuickRating(null); }} style={{ padding: "6px 12px", border: "none", borderRadius: 7, background: "#4f46e5", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Lưu</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
            <thead><tr style={{ background: "#f9fafb" }}>{[["Tiêu đề","24%"],["Phòng","8%"],["Nhân viên","12%"],["Tiến độ","10%"],["Hạn chót","10%"],["Đánh giá","10%"],["Trạng thái","12%"],["","14%"]].map(([h,w]) => <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", width: w }}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>Không có nhiệm vụ</td></tr>}
              {paged.map(t => (
                <tr key={t.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "9px 12px" }}>
                    <div onClick={() => { setModal(t); loadComments(t.id); }} style={{ fontWeight: 500, cursor: "pointer", whiteSpace: "normal", wordBreak: "break-word" }} onMouseEnter={e => e.target.style.color = "#4f46e5"} onMouseLeave={e => e.target.style.color = "#111"}>
                      {t.template_id && "🔄 "}{myNewTaskIds.has(t.id) && <span style={{ background: "#dc2626", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 8, marginRight: 5 }}>MỚI</span>}{t.title}
                    </div>
                  </td>
                  <td style={{ padding: "9px 12px" }}><span style={{ background: DEPT_COLOR[t.dept] + "22", color: DEPT_COLOR[t.dept], fontSize: 11, padding: "2px 6px", borderRadius: 8 }}>{t.dept}</span></td>
                  <td style={{ padding: "9px 12px", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{getEmp(t.eid)?.name || "–"}</div>
                    {canEditTask(t) && !t.completed && (t.viewed_at
                      ? <div title={`Đã xem lúc ${t.viewed_at}`} style={{ fontSize: 10, color: "#15803d", marginTop: 2 }}>👁️ Đã xem</div>
                      : <div style={{ fontSize: 10, color: "#b91c1c", marginTop: 2 }}>🔴 Chưa xem</div>)}
                  </td>
                  <td style={{ padding: "9px 12px", position: "relative" }}>
                    {quickProgress === t.id ? (
                      <div style={{ position: "absolute", top: 4, left: 0, zIndex: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", display: "flex", flexWrap: "wrap", gap: 4, width: 200 }}>
                        {[0,10,20,30,40,50,60,70,80,90,100].map(v => {
                          const a = (t.progress || 0) === v;
                          return <button key={v} onClick={async () => { if(v===100){setQuickProgress(null);onCompleteRequest(t);return;} await updateTask(t.id, { progress: v }, "Cập nhật tiến độ: " + v + "%"); setQuickProgress(null); }} style={{ padding: "4px 8px", border: "1.5px solid " + (a ? "#4f46e5" : "#e5e7eb"), borderRadius: 6, background: a ? "#eef2ff" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: a ? 700 : 400, color: a ? "#4f46e5" : "#374151" }}>{v}%</button>;
                        })}
                        <button onClick={() => setQuickProgress(null)} style={{ padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#f9fafb", cursor: "pointer", fontSize: 12, color: "#9ca3af", width: "100%", marginTop: 2 }}>Hủy</button>
                      </div>
                    ) : (
                      <div onClick={() => canUpdateProgress(t) && !t.completed && !t.completion_requested && setQuickProgress(t.id)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: canUpdateProgress(t) && !t.completed && !t.completion_requested ? "pointer" : "default" }} title={t.completion_requested ? "Đang chờ duyệt" : canUpdateProgress(t) && !t.completed ? "Bấm để cập nhật tiến độ" : t.completed ? "Đã hoàn thành" : ""}>
                        <div style={{ flex: 1, height: 6, background: "#e5e7eb", borderRadius: 6, overflow: "hidden", minWidth: 60 }}><div style={{ height: "100%", width: (t.progress || 0) + "%", background: t.progress === 100 ? "#16a34a" : t.progress >= 50 ? "#f59e0b" : "#6366f1", borderRadius: 6, transition: "width 0.3s" }} /></div>
                        <span style={{ fontSize: 11, color: canUpdateProgress(t) && !t.completed && !t.completion_requested ? "#4f46e5" : "#6b7280", flexShrink: 0, fontWeight: canUpdateProgress(t) && !t.completed && !t.completion_requested ? 600 : 400 }}>{t.progress || 0}%</span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "9px 12px", fontSize: 12, color: t.status === "overdue" ? "#b91c1c" : "#6b7280", fontWeight: t.status === "overdue" ? 600 : 400 }}>{t.deadline}</td>
                  <td style={{ padding: "9px 12px", position: "relative" }}>
                    {quickRate === t.id ? (
                      <div style={{ position: "absolute", top: 4, left: 0, zIndex: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", gap: 6, whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {Object.entries(RATING).map(([key, r]) => (
                            <button key={key} onClick={() => setPendingQuickRating(key)} style={{ padding: "5px 10px", border: "2px solid " + (pendingQuickRating === key ? r.col : "#e5e7eb"), borderRadius: 7, background: pendingQuickRating === key ? r.bg : "#fff", cursor: "pointer", fontSize: 12, fontWeight: pendingQuickRating === key ? 700 : 400, color: pendingQuickRating === key ? r.col : "#374151" }}>{r.icon} {r.label}</button>
                          ))}
                          <button onClick={() => { setQuickRate(null); setPendingQuickRating(null); setRatingNote(""); }} style={{ padding: "5px 8px", border: "1px solid #e5e7eb", borderRadius: 7, background: "#f9fafb", cursor: "pointer", fontSize: 12, color: "#9ca3af" }}>✕</button>
                        </div>
                        {pendingQuickRating && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <input value={ratingNote} onChange={e => setRatingNote(e.target.value)} placeholder={["tb","kem"].includes(pendingQuickRating) ? "Nhận xét (bắt buộc)..." : "Nhận xét..."} style={{ ...inp, width: 220 }} />
                            <button onClick={() => { rateTask(t.id, pendingQuickRating); setQuickRate(null); setPendingQuickRating(null); }} style={{ padding: "5px 10px", border: "none", borderRadius: 7, background: "#4f46e5", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Lưu</button>
                          </div>
                        )}
                      </div>
                    ) : t.rating ? (
                      <span onClick={() => canRate(t) && (setQuickRate(t.id), setPendingQuickRating(null), setRatingNote(""))} style={{ cursor: canRate(t) ? "pointer" : "default" }}><RatingBadge r={t.rating} /></span>
                    ) : (
                      <span onClick={() => t.status === "completed" && canRate(t) && (setQuickRate(t.id), setPendingQuickRating(null), setRatingNote(""))} style={{ background: t.status === "completed" && canRate(t) ? "#fef9c3" : "transparent", color: t.status === "completed" && canRate(t) ? "#92400e" : "#d1d5db", fontSize: 12, cursor: t.status === "completed" && canRate(t) ? "pointer" : "default", padding: t.status === "completed" && canRate(t) ? "2px 8px" : "0", borderRadius: 8, border: t.status === "completed" && canRate(t) ? "1px solid #fde68a" : "none", fontWeight: t.status === "completed" && canRate(t) ? 600 : 400 }} title={t.status === "completed" ? canRate(t) ? "⭐ Bấm để đánh giá (bắt buộc)" : "Bạn không phải người giao việc này" : "Hoàn thành nhiệm vụ trước khi đánh giá"}>
                        {t.status === "completed" ? canRate(t) ? "⭐ Đánh giá" : "—" : "—"}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "9px 12px" }}><Chip s={t.status} /><div style={{ marginTop: 3 }}><PendingApprovalWarning t={t} /></div></td>
                  <td style={{ padding: "9px 12px" }}>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {t.completed && canEditTask(t) && <button onClick={() => toggleDone(t)} title="Bỏ hoàn thành" style={{ padding: "3px 6px", border: "1px solid #d1d5db", borderRadius: 5, background: "#f9fafb", cursor: "pointer", fontSize: 12, color: "#6b7280" }}>↩</button>}
                      {!t.completed && !t.completion_requested && canUpdateProgress(t) && <button onClick={() => toggleDone(t)} title="Yêu cầu hoàn thành" style={{ padding: "3px 6px", border: "1px solid #fbbf24", borderRadius: 5, background: "#fffbeb", cursor: "pointer", fontSize: 12, color: "#92400e" }}>📨</button>}
                      {t.completion_requested && canApprove(t) && (<>
                        <button onClick={() => openApproveModal(t)} title="Duyệt & đánh giá" style={{ padding: "3px 6px", border: "1px solid #16a34a", borderRadius: 5, background: "#f0fdf4", cursor: "pointer", fontSize: 12, color: "#15803d" }}>✅</button>
                        <button onClick={() => rejectCompletionRequest(t)} title="Từ chối" style={{ padding: "3px 6px", border: "1px solid #fca5a5", borderRadius: 5, background: "#fff0f0", cursor: "pointer", fontSize: 12, color: "#dc2626" }}>↩</button>
                      </>)}
                      {t.completion_requested && !canApprove(t) && (currentUser?.employee_id === t.eid || t.requested_by === currentUser?.full_name) && <button onClick={() => remindApproval(t)} title={t.reminder_at ? `Đã nhắc lúc ${t.reminder_at}` : "Nhắc duyệt"} style={{ padding: "3px 6px", border: "1px solid #fbbf24", borderRadius: 5, background: "#fff", cursor: "pointer", fontSize: 12, color: "#92400e" }}>🔔</button>}
                      {canEditTask(t) && <button onClick={() => openEditTask(t)} style={{ padding: "3px 6px", border: "1px solid #d1d5db", borderRadius: 5, background: "#f9fafb", cursor: "pointer", fontSize: 12 }}>✏️</button>}
                      <button onClick={() => { setModal(t); loadComments(t.id); }} style={{ padding: "3px 6px", border: "1px solid #d1d5db", borderRadius: 5, background: "#f9fafb", cursor: "pointer", fontSize: 12 }}>💬</button>
                      {canDeleteTask(t) && <button onClick={() => setDeleteConfirm(t.id)} style={{ padding: "3px 6px", border: "1px solid #fca5a5", borderRadius: 5, background: "#fff0f0", cursor: "pointer", fontSize: 12, color: "#dc2626" }}>🗑️</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: "6px 12px", border: "1px solid #e5e7eb", borderRadius: 7, background: page <= 1 ? "#f9fafb" : "#fff", cursor: page <= 1 ? "not-allowed" : "pointer", fontSize: 13, color: page <= 1 ? "#d1d5db" : "#374151" }}>← Trước</button>
          <span style={{ fontSize: 13, color: "#6b7280" }}>Trang {page}/{totalPages} · {filtered.length} việc</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: "6px 12px", border: "1px solid #e5e7eb", borderRadius: 7, background: page >= totalPages ? "#f9fafb" : "#fff", cursor: page >= totalPages ? "not-allowed" : "pointer", fontSize: 13, color: page >= totalPages ? "#d1d5db" : "#374151" }}>Sau →</button>
        </div>
      )}
    </div>
  );
}
