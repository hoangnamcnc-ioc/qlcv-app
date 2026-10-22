// Vercel Cron — nhắc LỊCH TRỰC chiều hôm trước (16:30 giờ VN, mọi ngày): báo người trực NGÀY MAI.
//   ?dry=1 xem trước · ?only=<email> chỉ gửi 1 địa chỉ.
import { vnToday, addDaysYMD } from "./_lib/digest.js";
import { buildDutyReminders } from "./_lib/duty.js";
import { loadDigestData, maskEmail } from "./_lib/data.js";
import { sendMail, mailConfigured } from "./_lib/mail.js";
import { authorized } from "./_lib/auth.js";

export default async function handler(req, res) {
  if (!authorized(req)) { res.status(401).json({ ok: false, error: "unauthorized" }); return; }
  const q = req.query || {};
  const dry = q.dry === "1", only = (q.only || "").toString().trim().toLowerCase();
  try {
    // ?date=YYYY-MM-DD: chỉ để THỬ (đã qua xác thực CRON_SECRET) — mặc định là ngày mai theo giờ VN.
    const tomorrow = /^\d{4}-\d{2}-\d{2}$/.test(q.date || "") ? q.date : addDaysYMD(vnToday(), 1);
    const d = await loadDigestData();
    const row = d.duty.find(r => r.date === tomorrow);
    if (!row) { res.status(200).json({ ok: true, tomorrow, skipped: "chưa có lịch trực ngày mai" }); return; }
    let list = buildDutyReminders({ date: tomorrow, row, users: d.users, employees: d.employees, holidays: d.holidays, appUrl: process.env.APP_URL || "https://qlcv-app.vercel.app" });
    if (only) list = list.filter(x => x.to === only);
    if (dry) { res.status(200).json({ ok: true, dry: true, tomorrow, mailConfigured: mailConfigured(), candidates: list.map(x => ({ to: maskEmail(x.to), subject: x.subject, items: x.items })) }); return; }
    if (!mailConfigured()) { res.status(200).json({ ok: false, tomorrow, candidates: list.length, error: "Chưa cấu hình dịch vụ gửi email (RESEND_API_KEY hoặc SMTP_HOST)" }); return; }
    const failed = []; let sent = 0;
    for (let i = 0; i < list.length; i += 5) {
      const rs = await Promise.all(list.slice(i, i + 5).map(x => sendMail(x).then(r => ({ x, r }))));
      for (const { x, r } of rs) { if (r.ok) sent++; else failed.push({ to: maskEmail(x.to), error: r.error }); }
    }
    res.status(200).json({ ok: failed.length === 0, tomorrow, candidates: list.length, sent, failed });
  } catch (e) {
    res.status(500).json({ ok: false, error: String((e && e.message) || e).slice(0, 300) });
  }
}
