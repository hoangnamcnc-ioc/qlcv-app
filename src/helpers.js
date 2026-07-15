import { FREQUENCIES } from "./constants";

// toISOString() luôn trả theo giờ UTC — với múi giờ Việt Nam (UTC+7), 00:00 giờ local là 17:00 UTC
// NGÀY HÔM TRƯỚC, nên .toISOString().split("T")[0] bị lùi mất 1 ngày (todayStr luôn tính "hôm nay"
// thành hôm qua, khiến các việc định kỳ luôn bị trễ 1 ngày). Dùng thành phần ngày/tháng/năm THEO GIỜ
// ĐỊA PHƯƠNG để tránh lệch.
const toLocalYMD = d => { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${day}`; };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return toLocalYMD(x); };
export const today = new Date(); today.setHours(0, 0, 0, 0);
export const todayStr = toLocalYMD(today);
// HIỂN THỊ ngày cho người dùng: "2026-07-15" → "15/07/2026" (chuẩn Việt Nam). CHỈ dùng để hiển thị —
// dữ liệu lưu trong DB, ô <input type="date"> và mọi phép lọc/so sánh vẫn giữ nguyên dạng YYYY-MM-DD.
// Chuỗi không đúng dạng ISO (VD nowStr "HH:mm:ss d/M/yyyy") được trả về nguyên vẹn, không đụng tới.
export const fmtDate = s => { if (!s || typeof s !== "string") return s || ""; const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : s; };
export const nowStr = () => new Date().toLocaleString("vi-VN");
// Parse chuỗi do nowStr() sinh ra, dạng "HH:mm:ss d/M/yyyy" — Date() gốc hiểu nhầm d/M thành M/d (lịch Mỹ) nên phải tự tách.
export const parseNowStr = s => { if (!s || typeof s !== "string") return null; const [time, date] = s.split(" "); if (!time || !date) return null; const [h, mi, se] = time.split(":").map(Number); const [d, m, y] = date.split("/").map(Number); if (!d || !m || !y) return null; const dt = new Date(y, m - 1, d, h || 0, mi || 0, se || 0); return isNaN(dt) ? null : dt; };
// Cộng thêm `n` tháng nhưng GIỮ NGUYÊN ngày trong tháng, KẸP về ngày cuối tháng đích nếu ngày gốc không
// tồn tại ở tháng đó (VD: 31/1 + 1 tháng → 28/2 chứ không phải 3/3). JS gốc dùng setMonth() sẽ "tràn"
// sang tháng kế (Feb 31 → Mar 3), làm ngày sinh nhiệm vụ định kỳ trôi dần mỗi kỳ.
const addMonthsClamped = (d, n) => {
  const day = d.getDate();
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1); // sang tháng đích, tạm để ngày 1
  const lastDay = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate(); // ngày cuối của tháng đích
  x.setDate(Math.min(day, lastDay));
  return x;
};
export const getNextDate = (from, freq) => { let d = new Date(from); if (freq === "monthly") d = addMonthsClamped(d, 1); else if (freq === "quarterly") d = addMonthsClamped(d, 3); else if (freq === "semiannual") d = addMonthsClamped(d, 6); else if (freq === "yearly") d = addMonthsClamped(d, 12); else { const f = FREQUENCIES.find(x => x.value === freq); if (f) d.setDate(d.getDate() + f.days); } return toLocalYMD(d); };
// Quy đổi 1 lần tạo từ mẫu định kỳ thành bao nhiêu "việc" khi tính điểm hiệu suất — xem FREQUENCIES ở constants.js
export const freqWeight = freq => FREQUENCIES.find(f => f.value === freq)?.weight ?? 1;
// So sánh với thời điểm nhân viên YÊU CẦU duyệt (requested_at), không phải lúc người duyệt bấm duyệt (completed_at) —
// tránh nhân viên bị tính "trễ" oan vì Trưởng/Phó phòng duyệt chậm. Việc không qua bước yêu cầu duyệt (vd. admin gán completed
// trực tiếp) thì mới dùng completed_at làm mốc dự phòng.
export const isCompletedLateByDate = t => {
  if (!t?.deadline) return false;
  const dl = new Date(t.deadline); if (isNaN(dl)) return false; dl.setHours(0, 0, 0, 0);
  const fa = t.requested_at ? parseNowStr(t.requested_at) : (t.completed_at ? new Date(t.completed_at) : null);
  if (!fa || isNaN(fa)) return false;
  fa.setHours(0, 0, 0, 0);
  return fa > dl;
};
// Số ngày một yêu cầu duyệt hoàn thành đang bị "ngâm" — để cảnh báo BGĐ/Trưởng phòng duyệt chậm, không đổ lỗi cho nhân viên
export const pendingApprovalDays = t => { if (!t?.completion_requested || !t?.requested_at) return 0; const ra = parseNowStr(t.requested_at); if (!ra) return 0; ra.setHours(0, 0, 0, 0); return Math.max(0, Math.round((today - ra) / 86400000)); };
export const getStatus = t => { const dl = new Date(t.deadline); dl.setHours(0, 0, 0, 0); const d = Math.ceil((dl - today) / 86400000); if (t.completed) { if (t.late_reason || isCompletedLateByDate(t)) return "completed_late"; return "completed"; } if (t.completion_requested) return "pending_approval"; if (d < 0) return "overdue"; if (d <= 3) return "nearly_due"; return "on_time"; };
export const isCompletedStatus = s => s === "completed" || s === "completed_late";
export const isLateStatus = s => s === "overdue" || s === "completed_late";
export const parseJSON = (v, d = []) => { try { return JSON.parse(v || JSON.stringify(d)); } catch { return d; } };
export const hashPwd = async (pwd) => { const enc = new TextEncoder().encode(pwd); const buf = await crypto.subtle.digest("SHA-256", enc); return "h$" + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join(""); };
export const isHashed = (s) => typeof s === "string" && s.startsWith("h$");
export const getFileIcon = n => { const e = n.split(".").pop().toLowerCase(); if (["jpg","jpeg","png","gif"].includes(e)) return "🖼️"; if (e === "pdf") return "📄"; if (["doc","docx"].includes(e)) return "📝"; if (["xls","xlsx"].includes(e)) return "📊"; return "📎"; };
// Supabase Storage từ chối key chứa dấu tiếng Việt/ký tự đặc biệt ("InvalidKey").
// Chỉ dùng để đặt tên file lưu trữ — tên hiển thị cho người dùng vẫn giữ nguyên (file.name gốc).
export const sanitizeFileName = n => n
  .normalize("NFD").replace(/[̀-ͯ]/g, "") // bỏ dấu (á,à,ả...)
  .replace(/[đĐ]/g, m => m === "đ" ? "d" : "D")      // NFD không tách được đ/Đ
  .replace(/[^a-zA-Z0-9._-]/g, "_")                  // ký tự lạ khác -> _
  .replace(/_+/g, "_");
// Word/Excel/PowerPoint trình duyệt không tự hiển thị được, phải mở qua Google Docs Viewer
// mới xem trực tiếp trên tab mới thay vì bắt buộc tải về; PDF/ảnh trình duyệt đã tự hiển thị sẵn.
// .zip/.rar/khác thì không có cách xem trước, vẫn phải tải về.
export const getPreviewUrl = (url, name = "") => {
  const ext = name.split(".").pop().toLowerCase();
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  return url;
};
// Ép tải file về máy bất kể content-type gốc — thẻ <a download> không có tác dụng với URL
// khác domain (Supabase Storage), nên phải fetch về dạng blob (cùng domain giả) rồi mới tải.
export const forceDownload = async (url, name) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl; a.download = name || "file";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
};
