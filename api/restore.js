// KHÔI PHỤC dữ liệu từ tệp sao lưu. Chỉ Admin/Giám đốc.
//   body: { username, password, mode: "merge" | "replace", confirm: "KHOI PHUC", backup: {…} , dry?: true }
// dry = true: chỉ kiểm tra tệp và trả số dòng từng bảng, KHÔNG ghi.
import { verifyAdmin, validateBackup, restoreAll } from "./_lib/backup.js";

const clientIp = req => String(req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "Dùng POST" }); return; }
  try {
    let body = req.body; if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    const a = await verifyAdmin(body?.username, body?.password, clientIp(req));
    if (!a.ok) { res.status(a.status).json({ ok: false, error: a.error }); return; }
    const v = validateBackup(body.backup);
    if (!v.ok) { res.status(400).json({ ok: false, error: v.error }); return; }
    if (body.dry) { res.status(200).json({ ok: true, dry: true, counts: v.counts }); return; }
    if (body.confirm !== "KHOI PHUC") { res.status(400).json({ ok: false, error: 'Cần gõ đúng chữ "KHOI PHUC" để xác nhận' }); return; }
    const result = await restoreAll(body.backup, body.mode);
    res.status(200).json({ ok: true, mode: body.mode, restored: result, by: a.user.username });
  } catch (e) {
    res.status(500).json({ ok: false, error: String((e && e.message) || e).slice(0, 300) });
  }
}
