import { useState, useMemo } from "react";
import { supabase } from "../supabase";
import { DEPTS, FULL_ACCESS, RATING, LATE_REASONS, STATUS_ORDER } from "../constants";
import { today, todayStr, nowStr, parseNowStr, getStatus, isCompletedStatus, isLateStatus, parseJSON } from "../helpers";

const PAGE_SIZE = 20;

// Toàn bộ logic nghiệp vụ của "Nhiệm vụ": phân quyền, CRUD, luồng yêu cầu/duyệt hoàn thành,
// lọc/phân trang, và các danh sách phái sinh dùng cho thông báo.
// Tách khỏi App.jsx để component chính không phải ôm hết state + xử lý của module này.
export default function useTasks({ tasks, setTasks, employees, currentUser, canSeeAll, userDept, canCreate, showToast, getEmp, setModal, setSaving, delegations }) {
  // ── Phân quyền ──
  const canSeeTask = useMemo(() => (t) => { if (!currentUser) return false; if (canSeeAll) return true; if (["manager", "deputy_manager", "manager_hcth"].includes(currentUser.role)) return t.dept === userDept; if (t.eid === currentUser.employee_id) return true; return parseJSON(t.collab_eids, []).includes(currentUser.employee_id); }, [currentUser, canSeeAll, userDept]);
  const canEditTask = useMemo(() => (t) => { if (!currentUser) return false; if (["admin", "director"].includes(currentUser.role)) return true; if (["manager", "deputy_manager", "manager_hcth"].includes(currentUser.role)) return t.dept === userDept; return false; }, [currentUser, userDept]);
  const canDeleteTask = useMemo(() => (t) => { if (!currentUser) return false; if (["admin", "director"].includes(currentUser.role)) return true; if (["manager", "manager_hcth"].includes(currentUser.role)) return t.dept === userDept; return false; }, [currentUser, userDept]);
  // Cập nhật tiến độ: người chủ trì, quản lý, VÀ người phối hợp (họ đóng góp phần việc nên được ghi nhận tiến độ).
  const canUpdateProgress = useMemo(() => (t) => canEditTask(t) || currentUser?.employee_id === t.eid || parseJSON(t.collab_eids, []).includes(currentUser?.employee_id), [canEditTask, currentUser]);
  // Yêu cầu hoàn thành: CHỈ người chủ trì (t.eid) + quản lý — KHÔNG tính người phối hợp, vì hoàn thành là
  // chốt kết quả của cả nhiệm vụ, phải do người chịu trách nhiệm chính quyết định (đồng bộ với canProposeExtension).
  const canRequestCompletion = useMemo(() => (t) => canEditTask(t) || currentUser?.employee_id === t.eid, [canEditTask, currentUser]);
  const canRate = (t) => { const st = t.status || getStatus(t); if (st === "completed_late") return false; if (!t.completed && st !== "completed") return false;
    // Việc nhân viên TỰ TẠO: người tạo (nhân viên) KHÔNG được tự chấm điểm mình — chỉ Trưởng/Phó phòng (hoặc BGĐ) chấm.
    if (t.self_created) return isDeptManagerOf(t) || ["admin", "director"].includes(currentUser.role);
    if (t.created_by_id) { if (currentUser.id === t.created_by_id) return true; if (t.forwarded_by && t.forwarded_by === currentUser.full_name) return true; return FULL_ACCESS.includes(currentUser.role) && false; } return canCreate; };
  // Đúng người đã giao việc (hoặc người đã chuyển tiếp gần nhất) — dùng để quyết định AI ĐƯỢC CHỦ ĐỘNG BÁO,
  // không tính Admin/BGĐ vào đây để tránh mọi BGĐ đều nhận thông báo của tất cả nhiệm vụ trong hệ thống.
  const isAssigner = (t) => { if (!currentUser) return false; if (t.self_created) return false; /* việc tự tạo do TP/PP duyệt, không phải người tạo */ if (t.created_by_id === currentUser.id) return true; if (t.forwarded_by && t.forwarded_by === currentUser.full_name) return true; return false; };
  // Ủy quyền duyệt: Trưởng phòng vắng mặt có thể ủy quyền cho Phó phòng duyệt thay trong 1 khoảng ngày cụ thể.
  // Chỉ áp dụng theo created_by_id (người giao gốc) — không tính chuyển tiếp (forwarded_by) vì đó lưu dạng tên,
  // không có id để đối chiếu ủy quyền một cách chắc chắn.
  const isDelegatedApprover = (t) => { if (!currentUser || !t.created_by_id) return false; const now = todayStr; return (delegations || []).some(d => !d.revoked && d.delegate_id === currentUser.id && d.delegator_id === t.created_by_id && d.start_date <= now && d.end_date >= now); };
  // Duyệt hoàn thành: đúng người đã giao việc, hoặc người đang được ủy quyền duyệt thay, mới được duyệt & nhận xét —
  // Admin/BGĐ vẫn giữ quyền duyệt thay (nút bấm) để tránh việc bị kẹt khi người giao việc vắng mặt,
  // nhưng KHÔNG được chủ động báo qua chuông/popup đăng nhập (xem isAssigner ở trên).
  // Riêng nhiệm vụ tự sinh từ mẫu định kỳ (t.template_id): TP/PTP của PHÒNG NGƯỜI THỰC HIỆN luôn duyệt được,
  // bất kể ai đứng tên tạo mẫu — vì đây là việc thường quy của phòng, TP/PTP quản lý người đó phải chốt được.
  const isDeptManagerOf = (t) => !!currentUser && ["manager", "deputy_manager", "manager_hcth"].includes(currentUser.role) && t.dept === userDept;
  const canApprove = (t) => { if (!currentUser) return false; if (["admin", "director"].includes(currentUser.role)) return true; if (isAssigner(t)) return true; if ((t.template_id || t.self_created) && isDeptManagerOf(t)) return true; return isDelegatedApprover(t); };
  const canForward = (t) => { if (!currentUser) return false; if (t.completed || isCompletedStatus(t.status)) return false; return ["manager", "deputy_manager", "manager_hcth"].includes(currentUser.role) && t.dept === userDept; };
  const canSetLateReason = (t) => isLateStatus(t.status) && (currentUser?.employee_id === t.eid || parseJSON(t.collab_eids, []).includes(currentUser?.employee_id) || canCreate);
  // Đề xuất gia hạn deadline: chỉ đúng người được giao chính (không tính người phối hợp) mới đề xuất được,
  // và chỉ khi chưa có đề xuất nào khác đang treo (mỗi lúc chỉ 1 đề xuất chờ xử lý).
  const canProposeExtension = (t) => !!currentUser && currentUser.employee_id === t.eid && !t.completed && !t.completion_requested && !t.ext_proposed;
  // Nhân viên được sửa lại việc mình TỰ TẠO khi CHƯA hoàn thành & chưa gửi duyệt (sửa tiêu đề/mô tả/ưu tiên/đính kèm).
  // Không đổi được người nhận/phòng (khóa = chính mình) và hạn chót (dùng "đề xuất gia hạn" như việc thường).
  const canEditOwnSelfTask = (t) => !!currentUser && currentUser.role === "staff" && t.self_created && t.eid === currentUser.employee_id && !t.completed && !t.completion_requested;

  // ── CRUD ──
  const addTask = async data => { setSaving(true); const selfCreated = !canCreate; const h = [{ action: selfCreated ? "Nhân viên tự tạo việc" : "Tạo nhiệm vụ", by: currentUser.full_name, at: nowStr() }]; const t = { ...data, id: `t${Date.now()}`, completed: data.progress === 100, created: todayStr, created_by_id: currentUser.id, created_by_name: currentUser.full_name, self_created: selfCreated, forwarded_by: "", deleted: false, history: JSON.stringify(h), rating: "", rating_note: "", rated_by: "", rated_at: "", late_reason: "", late_note: "" }; const { error } = await supabase.from("tasks").insert(t); if (!error) { setTasks(p => [t, ...p]); showToast("Đã tạo nhiệm vụ"); } else { console.error("Lỗi tạo nhiệm vụ:", error); showToast("Lỗi: " + (error.message || "không tạo được"), "error"); } setSaving(false); return error ? null : t; };
  // LƯU Ý: progress===100 KHÔNG còn tự động suy ra completed:true — hoàn thành chỉ được đặt tường minh
  // qua confirmApproveCompletion (sau khi TP/PP/BGĐ duyệt), tránh việc "Yêu cầu hoàn thành" (cũng set progress:100)
  // vô tình bỏ qua bước duyệt.
  const updateTask = async (id, updates, note, opts = {}) => { const task = tasks.find(t => t.id === id); if (updates.progress === 100 && task && getStatus(task) === "overdue" && !task.late_reason) { showToast("Nhiệm vụ đã quá hạn. Vui lòng nhập nguyên nhân trễ hạn trước khi hoàn thành.", "error"); setModal(m => (m && m.id === id) ? { ...m, status: "overdue" } : { ...task, status: "overdue" }); return false; } if (!opts.silent) setSaving(true); if (note && task) { const h = parseJSON(task.history, []); h.push({ action: note, by: currentUser.full_name, at: nowStr() }); updates.history = JSON.stringify(h); } if (updates.completed === false) updates.completed_at = null; const { error } = await supabase.from("tasks").update(updates).eq("id", id); if (!error) { setTasks(p => p.map(t => t.id === id ? { ...t, ...updates } : t)); if (!opts.silent) showToast("Đã cập nhật"); } else if (!opts.silent) showToast("Lỗi: " + (error.message || ""), "error"); if (!opts.silent) setSaving(false); return !error; };

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

  // Trả về true/false báo cho nơi gọi biết hành động có thực hiện được không — quan trọng vì
  // TaskModal đóng modal chi tiết ngay sau khi gọi hàm này; nếu không phân biệt được thành công/bị
  // chặn, modal sẽ tự đóng cả khi bị chặn (VD: quá hạn chưa có lý do trễ), làm mất luôn ô chọn lý do
  // vừa được mở ra để nhân viên điền — nhìn như bấm nút không có tác dụng gì.
  const toggleDone = t => {
    const st = t.status || getStatus(t);
    if (t.completed) {
      if (!canEditTask(t)) { showToast("Chỉ Trưởng phòng/Phó phòng/Ban Giám đốc mới được bỏ hoàn thành", "error"); return false; }
      updateTask(t.id, { completed: false, completion_requested: false, progress: t.progress >= 100 ? 90 : t.progress, completed_at: null, rating: "", rating_note: "", rated_by: "", rated_at: "", completion_note: "", suspicious_completion: false }, "Bỏ hoàn thành");
      return true;
    }
    if (t.completion_requested) { showToast("Nhiệm vụ đang chờ duyệt hoàn thành", "error"); return false; }
    // Chốt chặn ở ĐÂY (điểm duy nhất xử lý yêu cầu hoàn thành) — bao cả trường hợp người phối hợp kéo
    // thanh tiến độ lên 100% (cũng gọi vào hàm này), không chỉ nút bấm.
    if (!canRequestCompletion(t)) { showToast("Chỉ người chủ trì hoặc quản lý mới được yêu cầu hoàn thành. Người phối hợp chỉ cập nhật tiến độ phần việc của mình.", "error"); return false; }
    // Race condition đã xảy ra thực tế: nhân viên chọn "Nguyên nhân trễ" rồi bấm "Yêu cầu hoàn thành"
    // ngay sau đó — nếu bấm trước khi setLateReasonFn (async) kịp lưu xong, `t` truyền vào đây vẫn là
    // bản CŨ (chưa có late_reason). Nếu setModal({...t,...}) đè thẳng lên state hiện tại, nó sẽ XOÁ MẤT
    // late_reason vừa lưu thành công ngay sau đó (do setLateReasonFn dùng functional update, có thể tới
    // sau lệnh này) → tạo vòng lặp vô tận "chọn lý do → bấm duyệt → lại bị hỏi lý do → ...". Dùng
    // functional update và ưu tiên giữ state MỚI NHẤT của modal (nếu đang mở đúng nhiệm vụ này) thay vì
    // ghi đè bằng snapshot cũ.
    if (st === "overdue" && !t.late_reason) {
      showToast("Nhiệm vụ đã quá hạn. Vui lòng nhập nguyên nhân trễ hạn trước khi yêu cầu hoàn thành.", "error");
      setModal(m => (m && m.id === t.id) ? { ...m, status: "overdue" } : { ...t, status: "overdue" });
      return false;
    }
    setCompletionNoteModal(t); setCompletionNote(""); setCompletionFiles(parseJSON(t.attachments, []));
    return true;
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
    if (["tb", "kem"].includes(approveRating) && approveNote.trim().length < 10) { showToast("Đánh giá Trung bình/Kém cần ghi rõ nhận xét (ít nhất 10 ký tự) để nhân viên biết cần cải thiện gì", "error"); return; }
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

  // ── Nhắc duyệt: người yêu cầu có thể nhắc nếu treo quá lâu, giới hạn 1 lần/4 giờ để tránh làm phiền ──
  const REMINDER_COOLDOWN_MS = 4 * 3600 * 1000;
  const remindApproval = async (task) => {
    const last = task.reminder_at ? parseNowStr(task.reminder_at) : null;
    if (last && (new Date() - last) < REMINDER_COOLDOWN_MS) { showToast("Bạn vừa nhắc gần đây, vui lòng đợi thêm trước khi nhắc lại", "error"); return; }
    const ok = await updateTask(task.id, { reminder_at: nowStr() }, "Nhắc duyệt hoàn thành", { silent: true });
    if (ok) showToast("Đã nhắc — nhiệm vụ sẽ nổi bật hơn trong thông báo của người duyệt");
    else showToast("Lỗi khi gửi nhắc, vui lòng thử lại", "error");
  };

  // ── Nhắc VIỆC (trưởng phòng/người giao → người thực hiện): tăng bộ đếm số lần nhắc, ghi vào lịch sử để
  // có bằng chứng đã đôn đốc, và nhân viên thấy "đã được nhắc N lần". Giới hạn 1 lần/4 giờ tránh làm phiền.
  const nudgeTask = async (task) => {
    const last = task.nudged_at ? parseNowStr(task.nudged_at) : null;
    if (last && (new Date() - last) < REMINDER_COOLDOWN_MS) { showToast("Bạn vừa nhắc gần đây, vui lòng đợi thêm trước khi nhắc lại", "error"); return; }
    const n = (task.nudge_count || 0) + 1;
    const ok = await updateTask(task.id, { nudge_count: n, nudged_at: nowStr(), nudged_by: currentUser.full_name }, `Nhắc việc (lần ${n})`);
    if (ok) { showToast(`Đã nhắc ${getEmp(task.eid)?.name || "người thực hiện"} — ghi vào lịch sử nhiệm vụ`); setModal(m => (m && m.id === task.id) ? { ...m, nudge_count: n, nudged_at: nowStr(), nudged_by: currentUser.full_name } : m); }
    else showToast("Lỗi khi gửi nhắc, vui lòng thử lại", "error");
  };

  // ── Đề xuất & duyệt gia hạn deadline: nhân viên đề xuất ngày mới + lý do,
  // người giao việc duyệt đúng ngày đó hoặc rút ngắn hơn (bắt buộc nêu lý do), hoặc từ chối hẳn.
  const [extRequestModal, setExtRequestModal] = useState(null);
  const [extProposedDate, setExtProposedDate] = useState("");
  const [extReason, setExtReason] = useState("");
  const openExtRequestModal = t => { setExtRequestModal(t); setExtProposedDate(t.deadline); setExtReason(""); };
  const submitExtRequest = async () => {
    const task = extRequestModal;
    if (!extProposedDate || extProposedDate <= task.deadline) { showToast("Ngày đề xuất phải muộn hơn hạn chót hiện tại", "error"); return; }
    if (extReason.trim().length < 5) { showToast("Vui lòng nêu rõ lý do xin gia hạn", "error"); return; }
    await updateTask(task.id, { ext_proposed: extProposedDate, ext_reason: extReason.trim(), ext_requested_by: currentUser.full_name, ext_requested_at: nowStr() }, `Đề xuất gia hạn đến ${extProposedDate}: "${extReason.trim().slice(0, 60)}"`);
    showToast("Đã gửi đề xuất gia hạn tới người giao việc");
    setExtRequestModal(null); setExtProposedDate(""); setExtReason("");
  };

  const [extDecideModal, setExtDecideModal] = useState(null); // { task, mode: "approve" | "reject" }
  const [extDecideDate, setExtDecideDate] = useState("");
  const [extDecideNote, setExtDecideNote] = useState("");
  const openExtApprove = t => { setExtDecideModal({ task: t, mode: "approve" }); setExtDecideDate(t.ext_proposed); setExtDecideNote(""); };
  const openExtReject = t => { setExtDecideModal({ task: t, mode: "reject" }); setExtDecideDate(""); setExtDecideNote(""); };
  const confirmExtDecision = async () => {
    if (!extDecideModal) return;
    const task = extDecideModal.task;
    const clear = { ext_proposed: null, ext_reason: null, ext_requested_by: null, ext_requested_at: null };
    if (extDecideModal.mode === "reject") {
      if (extDecideNote.trim().length < 5) { showToast("Vui lòng nêu rõ lý do từ chối", "error"); return; }
      await updateTask(task.id, clear, `Từ chối gia hạn (đề xuất ${task.ext_proposed}): "${extDecideNote.trim().slice(0, 80)}"`);
      showToast("Đã từ chối đề xuất gia hạn");
    } else {
      if (!extDecideDate) { showToast("Vui lòng chọn ngày duyệt", "error"); return; }
      if (extDecideDate > task.ext_proposed) { showToast("Không thể duyệt ngày muộn hơn ngày nhân viên đề xuất", "error"); return; }
      const shorter = extDecideDate !== task.ext_proposed;
      if (shorter && extDecideNote.trim().length < 5) { showToast("Bạn chọn ngày ngắn hơn đề xuất, vui lòng nêu rõ lý do", "error"); return; }
      const label = shorter ? `Duyệt gia hạn rút ngắn còn ${extDecideDate} (đề xuất ${task.ext_proposed}): "${extDecideNote.trim().slice(0, 80)}"` : `Duyệt gia hạn đến ${extDecideDate}`;
      await updateTask(task.id, { deadline: extDecideDate, ...clear }, label);
      showToast("Đã duyệt gia hạn");
    }
    setExtDecideModal(null); setExtDecideDate(""); setExtDecideNote("");
  };

  const [ratingNote, setRatingNote] = useState("");
  const [lateNote, setLateNote] = useState("");
  const rateTask = async (id, rating) => { if (["tb", "kem"].includes(rating) && ratingNote.trim().length < 10) { showToast("Đánh giá Trung bình/Kém cần ghi rõ nhận xét (ít nhất 10 ký tự) để nhân viên biết cần cải thiện gì", "error"); return; } const up = { rating, rating_note: ratingNote, rated_by: currentUser.full_name, rated_at: nowStr() }; await updateTask(id, up, `Đánh giá: ${RATING[rating]?.label}`); setModal(m => m ? { ...m, ...up } : m); setRatingNote(""); };
  const setLateReasonFn = async (id, reason) => { const up = { late_reason: reason, late_note: lateNote }; await updateTask(id, up, `Nguyên nhân trễ: ${LATE_REASONS.find(r => r.value === reason)?.label || reason}`); setModal(m => m ? { ...m, ...up } : m); setLateNote(""); };
  // Miễn phạt trễ khách quan (TP/PP/BGĐ): việc trễ vì lý do ngoài tầm kiểm soát → không trừ điểm phạt khi chấm.
  const toggleLateExcused = async (t) => { const next = !t.late_excused; const up = { late_excused: next }; const ok = await updateTask(t.id, up, next ? "Miễn phạt trễ (lý do khách quan)" : "Bỏ miễn phạt trễ"); if (ok) { setModal(m => (m && m.id === t.id) ? { ...m, ...up } : m); showToast(next ? "Đã miễn phạt trễ — việc này coi như đúng hạn khi tính điểm" : "Đã bỏ miễn phạt trễ"); } };

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

  // Bản TOÀN CỤC (không lọc theo quyền xem) — chỉ dùng cho Báo cáo/xếp hạng để mọi vai trò thấy
  // số liệu hiệu suất nhất quán, đầy đủ (khớp với dữ liệu Hỗ trợ/dự án vốn đã tải toàn cục).
  // KHÔNG dùng cho các danh sách thao tác — chúng vẫn giới hạn theo quyền qua "computed".
  const computedGlobal = useMemo(() => {
    const all = (tasks || []).filter(t => !t.deleted).map(t => ({ ...t, status: getStatus(t) }));
    if (!dateFrom && !dateTo) return all;
    return all.filter(t => { if (!t.deadline) return false; if (dateFrom && t.deadline < dateFrom) return false; if (dateTo && t.deadline > dateTo) return false; return true; });
  }, [tasks, dateFrom, dateTo]);

  const stats = useMemo(() => computed.reduce((a, t) => { a.total += 1; a[t.status] = (a[t.status] || 0) + 1; return a; }, { total: 0, on_time: 0, nearly_due: 0, overdue: 0, pending_approval: 0, completed_late: 0, completed: 0 }), [computed]);
  // Cùng các chỉ số trên nhưng tính theo TRỌNG SỐ quy đổi (nhiệm vụ định kỳ: ngày 0.25 … năm 3;
  // nhiệm vụ thường = 1) để hiển thị song song với số đầu việc, tránh hiểu nhầm khối lượng.
  const statsW = useMemo(() => {
    const r = computed.reduce((a, t) => { const wt = t.weight ?? 1; a.total += wt; a[t.status] = (a[t.status] || 0) + wt; return a; }, { total: 0, on_time: 0, nearly_due: 0, overdue: 0, pending_approval: 0, completed_late: 0, completed: 0 });
    Object.keys(r).forEach(k => { r[k] = Math.round(r[k] * 100) / 100; });
    return r;
  }, [computed]);
  const deptChart = useMemo(() => DEPTS.map(d => { const dt = computed.filter(t => t.dept === d); return { name: d, "Trong hạn": dt.filter(t => t.status === "on_time").length, "Sắp hết hạn": dt.filter(t => t.status === "nearly_due").length, "Quá hạn": dt.filter(t => t.status === "overdue").length, "Chờ duyệt": dt.filter(t => t.status === "pending_approval").length, "HT quá hạn": dt.filter(t => t.status === "completed_late").length, "Hoàn thành": dt.filter(t => t.status === "completed").length }; }), [computed]);

  const [fStatus, setFStatus] = useState("all");
  const [fDept, setFDept] = useState("all");
  const [fEid, setFEid] = useState("all");
  const [fAssignedByMe, setFAssignedByMe] = useState(false); // chỉ hiện nhiệm vụ do CHÍNH mình giao (tạo/chuyển tiếp) — giúp Trưởng phòng lọc riêng việc mình phải chịu trách nhiệm duyệt
  const [search, setSearch] = useState("");
  const [fSort, setFSort] = useState("urgency");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => { const f = computed.filter(t => { if (fStatus !== "all" && t.status !== fStatus) return false; if (fDept !== "all" && t.dept !== fDept) return false; if (fEid !== "all" && t.eid !== fEid) return false; if (fAssignedByMe && !isAssigner(t)) return false; if (search) { const q = search.toLowerCase(); const empName = (getEmp(t.eid)?.name || "").toLowerCase(); const hit = t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q) || empName.includes(q); if (!hit) return false; } return true; }); if (fSort === "urgency") return [...f].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)); if (fSort === "deadline_asc") return [...f].sort((a, b) => a.deadline.localeCompare(b.deadline)); if (fSort === "deadline_desc") return [...f].sort((a, b) => b.deadline.localeCompare(a.deadline)); if (fSort === "newest") return [...f].sort((a, b) => (b.created || "").localeCompare(a.created || "")); return f; }, [computed, fStatus, fDept, fEid, fAssignedByMe, search, fSort]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), [filtered]);
  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  // ── Thông báo phái sinh từ nhiệm vụ (luôn dựa trên TOÀN BỘ việc, không bị ảnh hưởng bởi bộ lọc thời gian) ──
  const notifications = useMemo(() => computedAll.filter(t => t.status === "overdue" || t.status === "nearly_due").sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)), [computedAll]);
  // Việc chờ chấm điểm: người giao (created_by_id) với việc thường; TP/PP với việc nhân viên tự tạo (self_created)
  const unratedTasks = useMemo(() => computedAll.filter(t => t.status === "completed" && !t.rating && (t.self_created ? isDeptManagerOf(t) : t.created_by_id === currentUser?.id)), [computedAll, currentUser, userDept]);
  const suspiciousTasks = useMemo(() => canCreate ? computedAll.filter(t => t.suspicious_completion && !t.rating) : [], [computedAll, canCreate]);
  // Nhiệm vụ thường đang chờ CHÍNH người xem duyệt (để hiện trong 🔔 thông báo, khác với "myPendingApprovals" của Nhiệm vụ khác)
  // Việc nhân viên tự tạo → định tuyến sang Trưởng/Phó phòng duyệt (isDeptManagerOf), không phải người tạo.
  const myPendingTaskApprovals = useMemo(() => computedAll.filter(t => t.status === "pending_approval" && (isAssigner(t) || (t.self_created && isDeptManagerOf(t)) || isDelegatedApprover(t))), [computedAll, currentUser, delegations, userDept]);
  const myPendingExtRequests = useMemo(() => computedAll.filter(t => t.ext_proposed && (isAssigner(t) || (t.self_created && isDeptManagerOf(t)) || isDelegatedApprover(t))), [computedAll, currentUser, delegations, userDept]);

  const seenKey = currentUser ? `qlcv_seen_${currentUser.username}` : null;
  const markSeen = () => {}; // giữ để tương thích chữ ký gọi cũ; trạng thái xem nay lưu ở viewed_at trên server
  const myAssignedTasks = useMemo(() => currentUser?.employee_id ? computedAll.filter(t => t.eid === currentUser.employee_id && !t.deleted) : [], [computedAll, currentUser]);
  // "Chưa xem" dựa trên viewed_at lưu ở server (không phải localStorage) để đúng trên mọi thiết bị
  const myNewTasks = useMemo(() => myAssignedTasks.filter(t => !t.viewed_at && !t.completed), [myAssignedTasks]);
  const myOverdueTasks = useMemo(() => myAssignedTasks.filter(t => t.status === "overdue"), [myAssignedTasks]);
  const myNewTaskIds = useMemo(() => new Set(myNewTasks.map(t => t.id)), [myNewTasks]);

  return {
    canSeeTask, canEditTask, canDeleteTask, canUpdateProgress, canRequestCompletion, canRate, canApprove, canForward, canSetLateReason, canProposeExtension,
    addTask, updateTask,
    forwardModal, setForwardModal, forwardEid, setForwardEid, forwardTask,
    deleteConfirm, setDeleteConfirm, deleteTaskFn, restoreTaskFn, purgeTaskFn,
    isSuspiciousCompletion, toggleDone, confirmCompletion,
    completionNoteModal, setCompletionNoteModal, completionNote, setCompletionNote, completionFiles, setCompletionFiles,
    approveModal, setApproveModal, approveRating, setApproveRating, approveNote, setApproveNote, openApproveModal, confirmApproveCompletion,
    rejectCompletionRequest, remindApproval, nudgeTask, canEditOwnSelfTask,
    extRequestModal, setExtRequestModal, extProposedDate, setExtProposedDate, extReason, setExtReason, openExtRequestModal, submitExtRequest,
    extDecideModal, setExtDecideModal, extDecideDate, setExtDecideDate, extDecideNote, setExtDecideNote, openExtApprove, openExtReject, confirmExtDecision,
    ratingNote, setRatingNote, lateNote, setLateNote, rateTask, setLateReasonFn, toggleLateExcused,
    visibleTasks, trashedTasks, computed, computedGlobal, stats, statsW, deptChart,
    dateFrom, setDateFrom, dateTo, setDateTo,
    fStatus, setFStatus, fDept, setFDept, fEid, setFEid, fAssignedByMe, setFAssignedByMe, search, setSearch, fSort, setFSort, page, setPage,
    filtered, paged, totalPages,
    notifications, unratedTasks, suspiciousTasks, myPendingTaskApprovals, myPendingExtRequests,
    seenKey, markSeen, myAssignedTasks, myNewTasks, myOverdueTasks, myNewTaskIds,
  };
}
