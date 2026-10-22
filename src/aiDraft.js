// Làm sạch kết quả nháp việc do AI trả về (module thuần, có test).
// Làm sạch nháp AI: ép kiểu, cắt độ dài, loại hạn không hợp lệ/đã qua, giới hạn số bước.
export function sanitizeDraft(d, todayStr) {
  if (!d || typeof d !== "object") return null;
  const str = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  const title = str(d.title, 160), description = str(d.description, 1500);
  if (!title && !description) return null;
  let deadline = str(d.deadline, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(Date.parse(deadline + "T00:00:00Z")) || deadline < todayStr) deadline = "";
  const prio = ["high", "medium", "low"].includes(d.prio) ? d.prio : "medium";
  const subtasks = (Array.isArray(d.subtasks) ? d.subtasks : []).map(x => str(x, 160)).filter(Boolean).slice(0, 8);
  return { title, description, deadline, prio, subtasks };
}

