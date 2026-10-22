// Chỉ cho phép gọi khi có đúng bí mật CRON_SECRET (Vercel Cron tự gửi "Authorization: Bearer <CRON_SECRET>").
// Không nhận bí mật qua URL (tránh lộ trong log). Chưa đặt CRON_SECRET → từ chối tất cả.
export const authorized = req => { const s = process.env.CRON_SECRET; return !!s && (req.headers?.authorization || "") === `Bearer ${s}`; };
