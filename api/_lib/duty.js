// Dựng email NHẮC LỊCH TRỰC (module thuần, có test): chiều hôm trước nhắc những người trực NGÀY MAI.
// Khớp người trực với tài khoản qua TÊN nhân viên (lịch trực lưu tên dạng chữ). Ca trực theo quy định (giống màn Lịch trực):
//   • Thứ 7, Chủ nhật, ngày lễ: DC 3 ca 8 tiếng; IOC 2 ca.   • Thứ 2–6: DC 3 ca (17h30–07h30); IOC 1 ca 17h30–21h30.
import { esc, isValidEmail, isWorkday } from "./digest.js";

const SHIFTS = {
  weekend: {
    DC: [{ label: "Ca 1", time: "07h00 - 15h00" }, { label: "Ca 2", time: "15h00 - 23h00" }, { label: "Ca 3", time: "23h00 - 07h00 (hôm sau)" }],
    IOC: [{ label: "Ca 1", time: "07h30 - 11h30" }, { label: "Ca 2", time: "13h30 - 17h30" }],
  },
  weekday: {
    DC: [{ label: "Ca 1", time: "17h30 - 21h30" }, { label: "Ca 2", time: "21h30 - 01h30 (hôm sau)" }, { label: "Ca 3", time: "01h30 - 07h30" }],
    IOC: [{ label: "", time: "17h30 - 21h30" }],
  },
};
const dm = ymd => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
const WD = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
// KHỚP TÊN chịu được các biến thể thường gặp giữa lịch trực (nhập từ Word/PDF) và danh sách nhân viên:
//   bỏ dấu & chữ hoa/thường · bỏ dấu câu ("H'Lisa" = "H Lisa") · chữ viết tắt ("Phan Đ. V. Vinh Chuẩn" = "Phan Đăng Việt Vinh Chuẩn")
//   · chữ "thứ" dính ở đầu tên người trực lãnh đạo do lỗi đọc PDF ("Bảy Võ Nguyễn Hoàng Nam" = "Võ Nguyễn Hoàng Nam").
const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
export const nameKey = s => fold(s).replace(/[^a-z0-9]+/g, " ").trim();
const toks = s => nameKey(s).split(" ").filter(Boolean);
const WEEKDAY_WORDS = new Set(["hai", "ba", "tu", "nam", "sau", "bay", "nhat"]);
export const stripWeekday = name => { const t = String(name || "").trim().split(/\s+/); return t.length >= 3 && WEEKDAY_WORDS.has(fold(t[0])) ? t.slice(1).join(" ") : String(name || ""); };
export function sameName(a, b) {
  const ta = toks(a), tb = toks(b);
  if (!ta.length || !tb.length) return false;
  if (ta.join("") === tb.join("")) return true;
  return ta.length === tb.length && ta.every((x, i) => x === tb[i] || (x.length === 1 && tb[i].startsWith(x)) || (tb[i].length === 1 && x.startsWith(tb[i])));
}

const parseArr = v => { if (Array.isArray(v)) return v; try { const x = JSON.parse(v || "[]"); return Array.isArray(x) ? x : []; } catch { return []; } };
const people = v => parseArr(v).map((p, i) => (typeof p === "string" ? { name: p, shiftIdx: i } : { name: p?.name || "", shiftIdx: p?.shiftIdx ?? i })).filter(p => p.name.trim());

// Danh sách phân công của 1 ngày: [{ nameKey, label }]
export function assignmentsOf(row, holidays = []) {
  if (!row) return [];
  const kind = isWorkday(row.date, holidays) ? "weekday" : "weekend";
  const sh = SHIFTS[kind];
  const out = [];
  if ((row.leader || "").trim()) out.push({ name: row.leader, label: "Trực lãnh đạo" });
  for (const p of people(row.dc)) { const s = sh.DC[p.shiftIdx]; out.push({ name: p.name, label: `Trực DC${s ? ` — ${s.label} (${s.time})` : ""}` }); }
  for (const p of people(row.ioc)) { const s = sh.IOC[p.shiftIdx]; out.push({ name: p.name, label: `Trực IOC${s ? ` — ${s.label ? s.label + " " : ""}(${s.time})` : ""}` }); }
  return out;
}

export function buildDutyReminders({ date, row, users, employees, holidays = [], appUrl = "" }) {
  const asg = assignmentsOf(row, holidays);
  if (!asg.length) return [];
  const empById = new Map((employees || []).map(e => [e.id, e]));
  const wd = WD[new Date(date + "T00:00:00Z").getUTCDay()];
  const out = [], seen = new Set();
  for (const u of users || []) {
    const email = String(u.email || "").trim().toLowerCase();
    if (!isValidEmail(email) || seen.has(email)) continue;
    const emp = empById.get(u.employee_id);
    const who = emp?.name || u.full_name;
    const mine = asg.filter(a => sameName(who, a.name) || sameName(who, stripWeekday(a.name)));
    if (!mine.length) continue;
    seen.add(email);
    const name = u.full_name || emp?.name || "";
    const items = mine.map(a => a.label);
    const subject = `[QLCV] Ngày mai ${wd} ${dm(date)} bạn có lịch trực`;
    const html = `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#111;max-width:600px">
<div style="font-size:16px;font-weight:700">🗓️ Nhắc lịch trực — ${esc(wd)} ${dm(date)}</div>
<div style="margin-top:6px">Chào ${esc(name)}, ngày mai bạn được phân công:</div>
<ul style="margin:8px 0 12px;padding-left:20px">${items.map(i => `<li style="margin:3px 0"><b>${esc(i)}</b></li>`).join("")}</ul>
${row.note ? `<div style="color:#6b7280">Ghi chú: ${esc(row.note)}</div>` : ""}
${appUrl ? `<div style="margin-top:14px"><a href="${esc(appUrl)}" style="background:#7c3aed;color:#fff;padding:8px 16px;border-radius:8px;text-decoration:none;font-weight:600">Xem lịch trực</a></div>` : ""}
<div style="margin-top:16px;font-size:11.5px;color:#9ca3af">Email tự động từ hệ thống QLCV — DAK LAK IOC. Cần đổi ca/trực thay: đăng ký "Trực thay" trong mục Lịch trực. Muốn dừng nhận email: bấm ✉️ trong hệ thống và xoá trống ô email.</div></div>`;
    const text = `Nhắc lịch trực — ${wd} ${dm(date)}\nChào ${name}, ngày mai bạn được phân công:\n${items.map(i => "  - " + i).join("\n")}\n${row.note ? "Ghi chú: " + row.note + "\n" : ""}${appUrl ? "Xem lịch trực: " + appUrl + "\n" : ""}`;
    out.push({ to: email, name, subject, html, text, userId: u.id, items });
  }
  return out;
}
