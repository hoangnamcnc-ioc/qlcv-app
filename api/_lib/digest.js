// Dựng NỘI DUNG email nhắc việc (module thuần, có test — không gọi mạng, không đọc DB).
// Phạm vi theo vai trò:
//   • Nhân viên (staff)            → việc CỦA MÌNH.
//   • Trưởng/Phó phòng             → việc của CẢ PHÒNG mình.
//   • Ban Giám đốc                 → việc của PHÒNG được giao phụ trách (employees.oversees_dept).
//   • Admin                        → không nhận nhắc việc (chỉ nhận cảnh báo lịch trực sắp hết).
// Bỏ qua: việc đã xoá/đã xong/nháp chờ duyệt tạo, và việc định kỳ HẰNG NGÀY (~24 việc/ngày, sẽ gây nhiễu).

const DAY = 86400000;
const MANAGER_ROLES = ["manager", "deputy_manager", "manager_hcth"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_ROWS = 10;           // tối đa số dòng mỗi mục trong email
const SOON_DAYS = 3;           // "sắp đến hạn" = trong 3 ngày tới
const ESCALATE_DAYS = 14;      // trễ từ 14 ngày: nhấn mạnh cho quản lý

export const isValidEmail = e => EMAIL_RE.test(String(e || "").trim());
export const vnToday = (now = Date.now()) => new Date(now + 7 * 3600e3).toISOString().slice(0, 10); // giờ Việt Nam (UTC+7)
export const addDaysYMD = (ymd, n) => { const d = new Date(ymd + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diff = (a, b) => Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / DAY);
export const isWorkday = (ymd, holidays = []) => { const w = new Date(ymd + "T00:00:00Z").getUTCDay(); return w !== 0 && w !== 6 && !(holidays || []).includes(ymd); };
const isDaily = t => !!t.template_id && (t.weight ?? 1) <= 0.25;
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dm = ymd => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
const plural = (n, word) => `${n} ${word}`;

// Xác định phạm vi nhắc của 1 tài khoản. Trả { kind: "self"|"dept"|"none", eid?, depts? }
export function scopeOf(user, emp) {
  if (!user) return { kind: "none" };
  if (user.role === "admin") return { kind: "none" };
  if (!emp) return { kind: "none" };
  if (user.role === "staff") return { kind: "self", eid: emp.id };
  if (MANAGER_ROLES.includes(user.role)) return emp.dept ? { kind: "dept", depts: [emp.dept] } : { kind: "none" };
  if (user.role === "director") return emp.oversees_dept ? { kind: "dept", depts: [emp.oversees_dept], overseer: true } : { kind: "none" };
  return { kind: "none" };
}

const byLateDesc = (today) => (a, b) => diff(today, b.deadline) - diff(today, a.deadline);

// Gom các mục của 1 người dùng. tasks đã lọc "mở" (chưa xoá/xong, không định kỳ hằng ngày, không phải nháp).
export function sectionsFor(scope, tasks, pendingCreate, today) {
  const mine = scope.kind === "self" ? tasks.filter(t => t.eid === scope.eid) : tasks.filter(t => scope.depts.includes(t.dept));
  const active = mine.filter(t => !t.completion_requested);       // việc đang chờ duyệt hoàn thành không tính là "trễ"
  const late = t => diff(today, t.deadline);
  return {
    overdue: active.filter(t => late(t) >= 1).sort(byLateDesc(today)),
    escalated: active.filter(t => late(t) >= ESCALATE_DAYS).sort(byLateDesc(today)),
    dueToday: active.filter(t => late(t) === 0),
    soon: active.filter(t => late(t) < 0 && late(t) >= -SOON_DAYS).sort((a, b) => a.deadline.localeCompare(b.deadline)),
    waiting: scope.kind === "dept" ? mine.filter(t => t.completion_requested) : [],
    pendingCreate: scope.kind === "dept" ? pendingCreate.filter(t => scope.depts.includes(t.dept)) : [],
  };
}

function rowsHtml(list, today, empName, showWho) {
  const shown = list.slice(0, MAX_ROWS);
  const more = list.length - shown.length;
  const li = shown.map(t => {
    const late = diff(today, t.deadline);
    const when = late > 0 ? `<span style="color:#b91c1c">trễ ${late} ngày</span>` : late === 0 ? `<span style="color:#b45309">hạn hôm nay</span>` : `hạn ${dm(t.deadline)}`;
    const who = showWho && t.eid ? ` — <i>${esc(empName(t.eid))}</i>` : "";
    return `<li style="margin:3px 0">${esc(t.title)}${who} <span style="color:#6b7280">(${when})</span></li>`;
  }).join("");
  return `<ul style="margin:6px 0 10px;padding-left:20px">${li}${more > 0 ? `<li style="color:#6b7280;list-style:none">… và ${more} việc khác</li>` : ""}</ul>`;
}
function rowsText(list, today, empName, showWho) {
  const shown = list.slice(0, MAX_ROWS), more = list.length - shown.length;
  const lines = shown.map(t => {
    const late = diff(today, t.deadline);
    const when = late > 0 ? `trễ ${late} ngày` : late === 0 ? "hạn hôm nay" : `hạn ${dm(t.deadline)}`;
    return `  - ${t.title}${showWho && t.eid ? ` — ${empName(t.eid)}` : ""} (${when})`;
  });
  if (more > 0) lines.push(`  … và ${more} việc khác`);
  return lines.join("\n");
}

// Dựng danh sách email cho tất cả tài khoản có email hợp lệ và CÓ việc cần nhắc.
export function buildDigests({ today, users, employees, tasks, holidays = [], deptNames = {}, appUrl = "", dutyLast = null, dutyWarnDays = 10 }) {
  const empById = new Map((employees || []).map(e => [e.id, e]));
  const empName = id => empById.get(id)?.name || "—";
  const base = (tasks || []).filter(t => !t.deleted && !t.create_rejected && t.deadline);
  const open = base.filter(t => !t.completed && !t.pending_create && !isDaily(t));
  const pendingCreate = base.filter(t => t.pending_create && !t.completed);
  const dutyWarn = dutyLast ? diff(dutyLast, today) <= dutyWarnDays : false;
  const dutyDays = dutyLast ? diff(dutyLast, today) : null;
  const out = [], seen = new Set();

  for (const u of users || []) {
    const email = String(u.email || "").trim().toLowerCase();
    if (!isValidEmail(email) || seen.has(email)) continue;
    const emp = empById.get(u.employee_id);
    const scope = scopeOf(u, emp);
    const isDutyAdmin = (u.role === "admin" || u.role === "director") && dutyWarn;
    if (scope.kind === "none" && !isDutyAdmin) continue;

    const s = scope.kind === "none" ? { overdue: [], escalated: [], dueToday: [], soon: [], waiting: [], pendingCreate: [] } : sectionsFor(scope, open, pendingCreate, today);
    const total = s.overdue.length + s.dueToday.length + s.soon.length + s.waiting.length + s.pendingCreate.length;
    if (total === 0 && !isDutyAdmin) continue;
    seen.add(email);

    const deptTxt = scope.kind === "dept" ? scope.depts.map(d => deptNames[d] || d).join(", ") : "";
    const label = scope.kind === "dept" ? (scope.overseer ? `Phòng bạn phụ trách (${deptTxt})` : `Phòng ${deptTxt}`) : "Việc của bạn";
    const parts = [];
    if (s.overdue.length) parts.push(`${s.overdue.length} việc quá hạn`);
    if (s.dueToday.length) parts.push(`${s.dueToday.length} đến hạn hôm nay`);
    if (s.waiting.length + s.pendingCreate.length) parts.push(`${s.waiting.length + s.pendingCreate.length} chờ duyệt`);
    if (!parts.length && s.soon.length) parts.push(`${s.soon.length} sắp đến hạn`);
    if (!parts.length && isDutyAdmin) parts.push("lịch trực sắp hết");
    const subject = `[QLCV] ${scope.kind === "dept" ? deptTxt + ": " : ""}${parts.join(", ")}`;

    const showWho = scope.kind === "dept";
    const sec = (title, color, list) => list.length ? `<div style="margin-top:14px"><div style="font-weight:700;color:${color}">${title} (${list.length})</div>${rowsHtml(list, today, empName, showWho)}</div>` : "";
    const secT = (title, list) => list.length ? `\n${title} (${list.length}):\n${rowsText(list, today, empName, showWho)}\n` : "";

    const name = u.full_name || emp?.name || "";
    const dutyHtml = isDutyAdmin ? `<div style="margin-top:14px;padding:10px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;color:#92400e">⚠️ <b>${dutyDays < 0 ? `Lịch trực đã hết từ ${dm(dutyLast)}` : `Lịch trực chỉ còn đến ${dm(dutyLast)} (còn ${dutyDays} ngày)`}</b> — vui lòng nhập lịch trực tháng tiếp theo.</div>` : "";
    const dutyText = isDutyAdmin ? `\n⚠️ ${dutyDays < 0 ? `Lịch trực đã hết từ ${dm(dutyLast)}` : `Lịch trực chỉ còn đến ${dm(dutyLast)} (còn ${dutyDays} ngày)`} — vui lòng nhập lịch trực tháng tiếp theo.\n` : "";

    const html = `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#111;max-width:640px">
<div style="font-size:16px;font-weight:700">${esc(label)} — ${dm(today)}</div>
<div style="margin-top:4px">Chào ${esc(name)}, đây là tổng hợp việc cần chú ý hôm nay:</div>
${sec("⏰ Quá hạn", "#b91c1c", s.overdue)}
${s.escalated.length ? `<div style="margin-top:8px;color:#991b1b">🚨 Trong đó <b>${s.escalated.length}</b> việc đã trễ từ ${ESCALATE_DAYS} ngày trở lên.</div>` : ""}
${sec("📅 Đến hạn hôm nay", "#b45309", s.dueToday)}
${sec("⏳ Sắp đến hạn (3 ngày tới)", "#1d4ed8", s.soon)}
${sec("📨 Chờ bạn duyệt hoàn thành", "#15803d", s.waiting)}
${sec("🆕 Việc nhân viên tự tạo chờ duyệt", "#15803d", s.pendingCreate)}
${dutyHtml}
<div style="margin-top:18px">${appUrl ? `<a href="${esc(appUrl)}" style="background:#4f46e5;color:#fff;padding:8px 16px;border-radius:8px;text-decoration:none;font-weight:600">Mở hệ thống QLCV</a>` : ""}</div>
<div style="margin-top:16px;font-size:11.5px;color:#9ca3af">Email tự động từ hệ thống Quản lý giao việc — DAK LAK IOC. Muốn dừng nhận email nhắc việc: trong hệ thống bấm biểu tượng ✉️ và xoá trống ô email.</div>
</div>`;
    const text = `${label} — ${dm(today)}\nChào ${name}, đây là tổng hợp việc cần chú ý hôm nay:\n${secT("Quá hạn", s.overdue)}${s.escalated.length ? `\n(Trong đó ${s.escalated.length} việc đã trễ từ ${ESCALATE_DAYS} ngày trở lên)\n` : ""}${secT("Đến hạn hôm nay", s.dueToday)}${secT("Sắp đến hạn (3 ngày tới)", s.soon)}${secT("Chờ bạn duyệt hoàn thành", s.waiting)}${secT("Việc nhân viên tự tạo chờ duyệt", s.pendingCreate)}${dutyText}\n${appUrl ? "Mở hệ thống: " + appUrl + "\n" : ""}\nMuốn dừng nhận email: bấm biểu tượng ✉️ trong hệ thống và xoá trống ô email.`;

    out.push({ to: email, name, subject, html, text, userId: u.id, counts: { overdue: s.overdue.length, escalated: s.escalated.length, dueToday: s.dueToday.length, soon: s.soon.length, waiting: s.waiting.length, pendingCreate: s.pendingCreate.length }, scope: scope.kind });
  }
  return out;
}
