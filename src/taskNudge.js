// Logic thuần (có test) cho nhắc việc thông minh: việc quá hạn nào cần người phụ trách cập nhật tình trạng,
// và khi nào leo thang lên Trưởng/Phó phòng.
export const NUDGE_AFTER_DAYS = 3;     // trễ từ 3 ngày: hỏi chủ việc "đã xong / xin gia hạn / lý do trễ"
export const ESCALATE_AFTER_DAYS = 14; // trễ từ 14 ngày: báo Trưởng/Phó phòng (và BGĐ phụ trách phòng)

// Số ngày trễ giữa 2 chuỗi YYYY-MM-DD (tính theo ngày lịch, không lệch múi giờ). >0 = đã quá hạn.
export const daysLate = (deadline, todayStr) => {
  const a = Date.parse((deadline || "") + "T00:00:00Z"), b = Date.parse((todayStr || "") + "T00:00:00Z");
  return Number.isNaN(a) || Number.isNaN(b) ? 0 : Math.round((b - a) / 86400000);
};

// Việc định kỳ HÀNG NGÀY (trọng số 0.25) sinh ~24 việc/ngày → không đưa vào nhắc/leo thang để khỏi gây nhiễu.
export const isDailyRecurring = t => !!t && !!t.template_id && (t.weight ?? 1) <= 0.25;

// Việc còn "treo" (chưa xong, chưa chờ duyệt, không phải việc hằng ngày/việc chờ duyệt tạo) và đã trễ ≥ minDays ngày.
export const needsAttention = (t, todayStr, minDays = NUDGE_AFTER_DAYS) =>
  !!t && !t.deleted && !t.pending_create && !t.completed && !t.completion_requested && !t.create_rejected
  && !isDailyRecurring(t) && !!t.deadline && daysLate(t.deadline, todayStr) >= minDays;

export const isEscalated = (t, todayStr) => needsAttention(t, todayStr, ESCALATE_AFTER_DAYS);

// Việc của chính người dùng cần cập nhật (sắp việc trễ lâu nhất lên trước).
export const myAttentionList = (tasks, myEid, todayStr) =>
  (tasks || []).filter(t => t.eid === myEid && needsAttention(t, todayStr)).sort((a, b) => daysLate(b.deadline, todayStr) - daysLate(a.deadline, todayStr));

// Việc trễ lâu trong phạm vi các phòng (dùng cho Trưởng/Phó phòng, BGĐ phụ trách). Bỏ việc của chính người xem.
export const escalatedList = (tasks, depts, excludeEid, todayStr) => {
  const set = new Set(depts || []);
  return (tasks || []).filter(t => (set.size === 0 || set.has(t.dept)) && t.eid !== excludeEid && isEscalated(t, todayStr))
    .sort((a, b) => daysLate(b.deadline, todayStr) - daysLate(a.deadline, todayStr));
};
