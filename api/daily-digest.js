// Vercel Cron — email NHẮC VIỆC buổi sáng (07:30 giờ VN, Thứ 2–6). Phạm vi theo vai trò: xem api/_lib/digest.js.
//   ?dry=1          xem trước (KHÔNG gửi): trả danh sách người nhận (đã che email) + số liệu.
//   ?only=<email>   chỉ gửi cho 1 địa chỉ (dùng để thử lần đầu).
//   ?force=1        chạy cả ngày nghỉ (để thử).
import { buildDigests, vnToday, isWorkday } from "./_lib/digest.js";
import { loadDigestData, maskEmail } from "./_lib/data.js";
import { sendMail, mailConfigured } from "./_lib/mail.js";
import { authorized } from "./_lib/auth.js";

export default async function handler(req, res) {
  if (!authorized(req)) { res.status(401).json({ ok: false, error: "unauthorized" }); return; }
  const q = req.query || {};
  const dry = q.dry === "1", force = q.force === "1", only = (q.only || "").toString().trim().toLowerCase();
  try {
    const today = vnToday();
    const d = await loadDigestData();
    if (!force && !isWorkday(today, d.holidays)) { res.status(200).json({ ok: true, today, skipped: "ngày nghỉ (T7/CN/lễ)" }); return; }
    const dutyLast = d.duty.reduce((m, r) => (r.date > m ? r.date : m), "") || null;
    let list = buildDigests({ today, users: d.users, employees: d.employees, tasks: d.tasks, holidays: d.holidays, deptNames: d.deptNames, appUrl: process.env.APP_URL || "https://qlcv-app.vercel.app", dutyLast });
    if (only) list = list.filter(x => x.to === only);
    if (dry) { res.status(200).json({ ok: true, dry: true, today, mailConfigured: mailConfigured(), withEmail: d.users.filter(u => u.email).length, candidates: list.map(x => ({ to: maskEmail(x.to), scope: x.scope, subject: x.subject, counts: x.counts })) }); return; }
    if (!mailConfigured()) { res.status(200).json({ ok: false, today, candidates: list.length, error: "Chưa cấu hình dịch vụ gửi email (RESEND_API_KEY hoặc SMTP_HOST)" }); return; }
    const failed = []; let sent = 0;
    for (let i = 0; i < list.length; i += 5) {
      const rs = await Promise.all(list.slice(i, i + 5).map(x => sendMail(x).then(r => ({ x, r }))));
      for (const { x, r } of rs) { if (r.ok) sent++; else failed.push({ to: maskEmail(x.to), error: r.error }); }
    }
    res.status(200).json({ ok: failed.length === 0, today, candidates: list.length, sent, failed });
  } catch (e) {
    res.status(500).json({ ok: false, error: String((e && e.message) || e).slice(0, 300) });
  }
}
