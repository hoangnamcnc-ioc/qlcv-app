// Gửi email: ưu tiên Resend (RESEND_API_KEY), nếu không thì SMTP (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_SECURE).
// Chưa cấu hình dịch vụ nào → trả lỗi rõ ràng (hàm nhắc việc vẫn chạy được chế độ ?dry=1 để xem trước).
export const mailConfigured = () => !!(process.env.RESEND_API_KEY || process.env.SMTP_HOST);

export async function sendMail({ to, subject, html, text }) {
  const from = process.env.MAIL_FROM || "QLCV DAK LAK IOC <onboarding@resend.dev>";
  try {
    if (process.env.RESEND_API_KEY) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
      });
      if (!r.ok) return { ok: false, error: `Resend ${r.status}: ${(await r.text().catch(() => "")).slice(0, 160)}` };
      return { ok: true };
    }
    if (process.env.SMTP_HOST) {
      const nodemailer = (await import("nodemailer")).default;
      const port = Number(process.env.SMTP_PORT || 587);
      const tr = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port,
        secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
      await tr.sendMail({ from, to, subject, html, text });
      return { ok: true };
    }
    return { ok: false, error: "Chưa cấu hình dịch vụ gửi email (đặt RESEND_API_KEY hoặc SMTP_HOST trên Vercel)" };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e).slice(0, 200) };
  }
}
