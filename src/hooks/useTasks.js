import { useState, useMemo } from "react";
import { supabase } from "../supabase";
import { DEPTS, FULL_ACCESS, RATING, LATE_REASONS, STATUS_ORDER } from "../constants";
import { today, todayStr, nowStr, getStatus, isCompletedStatus, isLateStatus, parseJSON } from "../helpers";

const PAGE_SIZE = 20;

// Toàn bộ logic nghiệp vụ của "Nhiệm vụ": phân quyền, CRUD, luồng yêu cầu/duyệt hoàn thành,
// lọc/phân trang, và các danh sách phái sinh dùng cho thông báo.
// Tách khỏi App.jsx để component chính không phải ôm hết state + xử lý của module này.
export default function useTasks({ tasks, setTasks, employees, currentUser, canSeeAll, userDept, canCreate, showToast, getEmp, setModal, setSaving }) {
  // ── Phân quyền ──
  const canSeeTask = useMemo(() => (t) => { if (!currentUser) return false; if (canSeeAll) return true; if (["manager", "deputy_manager"].includes(currentUser.role)) return t.dept === userDept; if (t.eid === currentUser.employee_id) return true; return parseJSON(t.collab_eids, []).includes(currentUser.employee_id); }, [currentUser, canSeeAll, userDept]);
  const canEditTask = useMemo(() => (t) => { if (!currentUser) return false; if (["admin", "director"].includes(currentUser.role)) return true; if (["manager", "deputy_manager", "manager_hcth"].includes(currentUser.role)) return t.dept === userDept; return false; }, [currentUser, userDept]);
  const canDeleteTask = useMemo(() => (t) => { if (!currentUser) return false; if (["admin", "director"].includes(currentUser.role)) return true; if (["manager", "manager_hcth"].includes(currentUser.role)) return t.dept === userDept; return false; }, [currentUser, userDept]);
  const canUpdateProgress = useMemo(() => (t) => canEditTask(t) || currentUser?.employee_id === t.eid || parseJSON(t.collab_eids, []).includes(currentUser?.employee_id), [canEditTask, currentUser]);
  const canRate = (t) => { const st = t.status || getStatus(t); if (st === "completed_late") return false; if (!t.completed && st !== "completed") return false; if (t.created_by_id) { if (currentUser.id === t.created_by_id) return true; if (t.forwarded_by && t.forwarded_by === currentUser.full_name) return true; return FULL_ACCESS.includes(currentUser.role) && false; } return canCreate; };
  const canForward = (t) => { if (!currentUser) return false; if (t.completed || isCompletedStatus(t.status)) return false; return ["manager", "deputy_manager"].includes(currentUser.role) && t.dept === userDept; };
  const canSetLateReason = (t) => isLateStatus(t.status) && (currentUser?.employee_id === t.eid || parseJSON(t.collab_eids, []).includes(currentUser?.employee_id) || canCreate);

  // ── CRUD ──
  const addTask = async data => { setSaving(true); const h = [{ action: "Tạo nhiệm vụ", by: currentUser.full_name, at: nowStr() }]; const t = { ...data, id: `t${Date.now()}`, completed: data.progress === 100, created: todayStr, created_by_id: currentUser.id, created_by_name: currentUser.full_name, forwarded_by: "", deleted: false, history: JSON.stringify(h), rating: "", rating_note: "", rated_by: "", rated_at: "", late_reason: "", late_note: "" }; const { error } = await supabase.from("tasks").insert(t); if (!error) { setTasks(p => [t, ...p]); showToast("Đã tạo nhiệm vụ"); } else { console.error("Lỗi tạo nhiệm vụ:", error); showToast("Lỗi: " + (error.message || "không tạo được"), "error"); } setSaving(false); return error ? null : t; };
  // LƯU Ý: progress===100 KHÔNG còn tự động suy ra completed:true — hoàn thành chỉ được đặt tường minh
  // qua confirmApproveCompletion (sau khi TP/PP/BGĐ duyệt), tránh việc "Yêu cầu hoàn thành" (cũng set progress:100)
  // vô tình bỏ qua bước duyệt.
  const updateTask = async (id, updates, note) => { const task = tasks.find(t => t.id === id); if (updates.progress === 100 && task && getStatus(task) === "overdue" && !task.late_reason) { showToast("Nhiệm vụ đã quá hạn. Vui lòng nhập nguyên nhân trễ hạn trước khi hoàn thành.", "error"); setModal({ ...task, status: "overdue" }); return; } setSaving(true); if (note && task) { const h = parseJSON(task.history, []); h.push({ action: note, by: currentUser.full_name, at: nowStr() }); updates.history = JSON.stringify(h); } if (updates.completed === false) updates.completed_at = null; const { error } = await supabase.from("tasks").update(updates).eq("id", id); if (!error) { setTasks(p => p.map(t => t.id === id ? { ...t, ...updates } : t)); showToast("Đã cập nhật"); } else showToast("Lỗi", "error"); setSaving(false); };

  const [forwardModal, setForwardModal] = useState(null);
  const [forwardEid, setForwardEid] = useState("");
  const forwardTask = async () => { if (!forwardModal || !forwardEid) return; setSaving(true); const task = forwardModal; const newEmp = getEmp(forwardEid); const oldEmp = getEmp(task.eid); const h = parseJSON(task.history, []); h.push({ action: `Chuyển tiếp cho ${newEmp?.name || "?"} thực hiện (phụ trách: ${oldEmp?.name || currentUser.full_name})`, by: currentUser.full_name, at: nowStr() });
    const collab = parseJSON(task.collab_eids, []); if (task.eid && !collab.includes(task.eid)) collab.push(task.eid); const newCollab = collab.filter(id => id !== forwardEid);
    const updates = { eid: forwardEid, collab_eids: JSON.stringify(newCollab), forwarded_by: currentUser.full_name, history: JSON.stringify(h) };
    const { error } = await supabase.from("tasks").update(updates).eq("id", task.id); if (!error) { setTasks(p => p.map(t => t.id === task.id ? { ...t, ...updates } : t)); showToast(`Đã chuyển tiếp cho ${newEmp?.name}`); setForwardModal(null); setForwardEid(""); } else { showToast("Lỗi: " + (error.message || "không chuyển được"), "error"); } setSaving(false); };

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const deleteTaskFn = async id => { setSaving(true); const task = tasks.find(t => t.id === id); const h = task ? parseJSON(task.history, []) : []; h.push({ action: "Xóa nhiệm vụ", by: currentUser.full_name, at: nowStr() }); await supabase.from("tasks").update({ deleted: true, history: JSON.stringify(h) }).eq("id", id); setTasks(p => p.map(t => t.id === id ? { ...t, deleted: true } : t)); setModal(null); setSaving(false); showToast("Đã chuyển vào thùng rác"); };
  const restoreTaskFn = async id => { setSaving(true); await supabase.from("tasks").update({ deleted: false }).eq("id", id); setTasks(p => p.map(t => t.id === id ? { ...t, deleted: false } : t)); setSaving(false); showToast("Đã khôi phục"); };
  const purgeTaskFn = async id => { setSaving(true); await supabase.from("tasks").delete().eq("id", id); setTasks(p => p.filter(t => t.id !== id)); setSaving(false); showToast("Đã xóa vĩnh viễn"); };

  // ── Yêu cầu hoàn thành → Chờ duyệt → Duyệt & đánh giá (TP/PP/BGĐ) ──
  const isSuspiciousCompletion = t => { if ((t.progress || 0) >= 80) return false; const dl = new Date(t.deadline); dl.setHours(23, 59, 59, 999); const hoursLeft = (dl - new Date()) / 3600000; return hoursLeft >= 0 && hoursLeft <= 24; };

  const [completionNoteModal, setCompletionNoteModal] = useState(null);
  const [completionNote, setCompletionNote] = useState("");
  const [completionFiles, setCompletionFiles] = useState([]);

  const toggleDone = t => {
    const st = t.status || getStatus(t);
    if (t.completed) {
      if (!canEditTask(t)) { showToast("Chỉ Trưởng phòng/Phó phòng/Ban Giám đốc mới được bỏ hoàn thành", "error"); return; }
      updateTask(t.id, { completed: false, completion_requested: false, progress: t.progress >= 100 ? 90 : t.progress, completed_at: null, rating: "", rating_note: "", rated_by: "", rated_at: "", completion_note: "", suspicious_completion: false }, "Bỏ hoàn thành");
      return;
    }
    if (t.completion_requested) { showToast("Nhiệm vụ đang chờ duyệt hoàn thành", "error"); return; }
    if (st === "overdue" && !t.late_reason) { showToast("Nhiệm vụ đã quá hạn. Vui lòng nhập nguyên nhân trễ hạn trước khi yêu cầu hoàn thành.", "error"); setModal({ ...t, status: "overdue" }); return; }
    setCompletionNoteModal(t); setCompletionNote(""); setCompletionFiles(parseJSON(t.attachments, []));
  };
  const confirmCompletion = async (task) => {
    if (!completionNote || completionNote.trim().length < 20) { showToast("Vui lòng mô tả kết quả (ít nhất 20 ký tự)", "error"); return; }
    const suspicious = isSuspiciousCompletion(task);
    await updateTask(task.id, { completion_requested: true, requested_by: currentUser.full_name, requested_at: nowStr(), progress: 100, completion_note: completionNote.trim(), suspicious_completion: suspicious, attachments: JSON.stringify(completionFiles) }, `Yêu cầu duyệt hoàn thành: "${completionNote.trim().slice(0, 50)}"`);
    showToast(suspicious ? "⚠️ Yêu cầu hoàn thành đột ngột — trưởng phòng sẽ thấy cảnh báo" : "Đã gửi yêu cầu duyệt hoàn thành", "success");
    setCompletionNoteModal(null); setCompletionNote(""); setCompletionFiles([]);
  };

  const [approveModal, setApproveModal] = useState(null); // task đang chờ duyệt
  const [approveRating, setApproveRating] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const openApproveModal = t => { setApproveModal(t); setApproveRating(""); setApproveNote(""); };
  const confirmApproveCompletion = async () => {
    if (!approveRating) { showToast("Vui lòng chọn mức đánh giá", "error"); return; }
    const task = approveModal;
    await updateTask(task.id, { completed: true, completion_requested: false, completed_at: task.completed_at || new Date().toISOString(), rating: approveRating, rating_note: approveNote, rated_by: currentUser.full_name, rated_at: nowStr() }, `Duyệt hoàn thành & đánh giá: ${RATING[approveRating]?.label}`);
    showToast("Đã duyệt hoàn thành nhiệm vụ");
    setApproveModal(null); setApproveRating(""); setApproveNote("");
  };
  const rejectCompletionRequest = async (task) => {
    if (!window.confirm("Từ chối yêu cầu hoàn thành và trả nhiệm vụ về cho người thực hiện làm lại?")) return;
    await updateTask(task.id, { completion_requested: false }, "Từ chối yêu cầu hoàn thành, yêu cầu làm lại");
    showToast("Đã từ chối, nhiệm vụ trở lại trạng thái thực hiện");
  };

  const [ratingNote, setRatingNote] = useState("");
  const [lateNote, setLateNote] = useState("");
  const rateTask = async (id, rating) => { const up = { rating, rating_note: ratingNote, rated_by: currentUser.full_name, rated_at: nowStr() }; await updateTask(id, up, `Đánh giá: ${RATING[rating]?.label}`); setModal(m => m ? { ...m, ...up } : m); setRatingNote(""); };
  const setLateReasonFn = async (id, reason) => { const up = { late_reason: reason, late_note: lateNote }; await updateTask(id, up, `Nguyên nhân trễ: ${LATE_REASONS.find(r => r.value === reason)?.label || reason}`); setModal(m => m ? { ...m, ...up } : m); setLateNote(""); };

  // ── Danh sách phái sinh: hiển thị, lọc, phân trang ──
  const visibleTasks = useMemo(() => (tasks || []).filter(t => !t.deleted && canSeeTask(t)), [tasks, canSeeTask]);
  const trashedTasks = useMemo(() => (tasks || []).filter(t => t.deleted && canSeeTask(t)), [tasks, canSeeTask]);
  const computedAll = useMemo(() => visibleTasks.map(t => ({ ...t, status: getStatus(t) })), [visibleTasks]);

  // ── Bộ lọc thời gian (Từ ngày...Đến ngày) theo hạn chót — dùng chung cho Dashboard & tab Nhiệm vụ ──
  // Không áp dụng cho thông báo/việc của tôi bên dưới để không "giấu" việc thật sự đang chờ xử lý.
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const computed = useMemo(() => {
    if (!dateFrom && !dateTo) return computedAll;
    return computedAll.filter(t => {
      if (!t.deadline) return false;
      if (dateFrom && t.deadline < dateFrom) return false;
      if (dateTo && t.deadline > dateTo) return false;
      return true;
    });
  }, [computedAll, dateFrom, dateTo]);

  const stats = useMemo(() => computed.reduce((a, t) => { a.total += 1; a[t.status] = (a[t.status] || 0) + 1; return a; }, { total: 0, on_time: 0, nearly_due: 0, overdue: 0, pending_approval: 0, completed_late: 0, completed: 0 }), [computed]);
  const deptChart = useMemo(() => DEPTS.map(d => { const dt = computed.filter(t => t.dept === d); return { name: d, "Trong hạn": dt.filter(t => t.status === "on_time").length, "Sắp hết hạn": dt.filter(t => t.status === "nearly_due").length, "Quá hạn": dt.filter(t => t.status === "overdue").length, "Chờ duyệt": dt.filter(t => t.status === "pending_approval").length, "HT quá hạn": dt.filter(t => t.status === "completed_late").length, "Hoàn thành": dt.filter(t => t.status === "completed").length }; }), [computed]);

  const [fStatus, setFStatus] = useState("all");
  const [fDept, setFDept] = useState("all");
  const [fEid, setFEid] = useState("all");
  const [search, setSearch] = useState("");
  const [fSort, setFSort] = useState("urgency");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => { const f = computed.filter(t => { if (fStatus !== "all" && t.status !== fStatus) return false; if (fDept !== "all" && t.dept !== fDept) return false; if (fEid !== "all" && t.eid !== fEid) return false; if (search) { const q = search.toLowerCase(); const empName = (getEmp(t.eid)?.name || "").toLowerCase(); const hit = t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q) || empName.includes(q); if (!hit) return false; } return true; }); if (fSort === "urgency") return [...f].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)); if (fSort === "deadline_asc") return [...f].sort((a, b) => a.deadline.localeCompare(b.deadline)); if (fSort === "deadline_desc") return [...f].sort((a, b) => b.deadline.localeCompare(a.deadline)); if (fSort === "newest") return [...f].sort((a, b) => (b.created || "").localeCompare(a.created || "")); return f; }, [computed, fStatus, fDept, fEid, search, fSort]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), [filtered]);
  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  // ── Thông báo phái sinh từ nhiệm vụ (luôn dựa trên TOÀN BỘ việc, không bị ảnh hưởng bởi bộ lọc thời gian) ──
  const notifications = useMemo(() => computedAll.filter(t => t.status === "overdue" || t.status === "nearly_due").sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)), [computedAll]);
  const unratedTasks = useMemo(() => computedAll.filter(t => t.status === "completed" && !t.rating && t.created_by_id === currentUser?.id), [computedAll, currentUser]);
  const suspiciousTasks = useMemo(() => canCreate ? computedAll.filter(t => t.suspicious_completion && !t.rating) : [], [computedAll, canCreate]);

  const seenKey = currentUser ? `qlcv_seen_${currentUser.username}` : null;
  const getSeenIds = () => { if (!seenKey) return []; try { return JSON.parse(localStorage.getItem(seenKey) || "[]"); } catch { return []; } };
  const markSeen = (id) => { if (!seenKey) return; const s = new Set(getSeenIds()); s.add(id); localStorage.setItem(seenKey, JSON.stringify([...s])); };
  const myAssignedTasks = useMemo(() => currentUser?.employee_id ? computedAll.filter(t => t.eid === currentUser.employee_id && !t.deleted) : [], [computedAll, currentUser]);
  const myNewTasks = useMemo(() => { const seen = new Set(getSeenIds()); return myAssignedTasks.filter(t => !seen.has(t.id)); }, [myAssignedTasks, currentUser]);
  const myOverdueTasks = useMemo(() => myAssignedTasks.filter(t => t.status === "overdue"), [myAssignedTasks]);
  const myNewTaskIds = useMemo(() => new Set(myNewTasks.map(t => t.id)), [myNewTasks]);

  return {
    canSeeTask, canEditTask, canDeleteTask, canUpdateProgress, canRate, canForward, canSetLateReason,
    addTask, updateTask,
    forwardModal, setForwardModal, forwardEid, setForwardEid, forwardTask,
    deleteConfirm, setDeleteConfirm, deleteTaskFn, restoreTaskFn, purgeTaskFn,
    isSuspiciousCompletion, toggleDone, confirmCompletion,
    completionNoteModal, setCompletionNoteModal, completionNote, setCompletionNote, completionFiles, setCompletionFiles,
    approveModal, setApproveModal, approveRating, setApproveRating, approveNote, setApproveNote, openApproveModal, confirmApproveCompletion,
    rejectCompletionRequest,
    ratingNote, setRatingNote, lateNote, setLateNote, rateTask, setLateReasonFn,
    visibleTasks, trashedTasks, computed, stats, deptChart,
    dateFrom, setDateFrom, dateTo, setDateTo,
    fStatus, setFStatus, fDept, setFDept, fEid, setFEid, search, setSearch, fSort, setFSort, page, setPage,
    filtered, paged, totalPages,
    notifications, unratedTasks, suspiciousTasks,
    seenKey, markSeen, myAssignedTasks, myNewTasks, myOverdueTasks, myNewTaskIds,
  };
}
