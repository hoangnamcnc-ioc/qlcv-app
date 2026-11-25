// Tải bản SAO LƯU toàn bộ dữ liệu (JSON). Chỉ Admin/Giám đốc; mật khẩu gửi trong thân yêu cầu POST (không đặt trên địa chỉ).
import { verifyAdmin, exportAll } from "./_lib/backup.js";

const clientIp = req => String(req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "Dùng POST" }); return; }
  try {
    let body = req.body; if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    const a = await verifyAdmin(body?.username, body?.password, clientIp(req));
    if (!a.ok) { res.status(a.status).json({ ok: false, error: a.error }); return; }
    const data = await exportAll();
    data.exported_by = a.user.username;
    res.setHeader("cache-control", "no-store");
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: String((e && e.message) || e).slice(0, 300) });
  }
}
