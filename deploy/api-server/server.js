// Máy chủ API nhỏ chạy trên VPS — thay các hàm serverless của Vercel (thư mục /api): email nhắc việc, nhắc lịch trực, proxy AI.
// Dùng lại NGUYÊN các file api/*.js (kiểu handler(req, res) của Vercel) qua một lớp tương thích mỏng.
// Chỉ lắng nghe 127.0.0.1 — Caddy chuyển tiếp /api/* tới đây. Biến môi trường nạp từ /etc/qlcv/api.env (systemd EnvironmentFile).
import http from "node:http";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { createStorage } from "./storage.js";

const PORT = Number(process.env.API_PORT || 3001);
const API_DIR = path.resolve(process.env.API_DIR || new URL("../../api", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ROUTES = { "/api/daily-digest": "daily-digest.js", "/api/duty-reminder": "duty-reminder.js", "/api/ai-intent": "ai-intent.js", "/api/backup": "backup.js", "/api/restore": "restore.js" };
const cache = new Map();
// Kho file đính kèm (thay Supabase Storage) — cùng giao thức /storage/v1/...
const storage = process.env.JWT_SECRET
  ? createStorage({ dir: process.env.STORAGE_DIR || "/var/lib/qlcv/storage", jwtSecret: process.env.JWT_SECRET, maxBytes: Number(process.env.MAX_UPLOAD_MB || 100) * 1024 * 1024 })
  : null;

async function readBody(req, limit = 1_000_000) {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > limit) throw new Error("body quá lớn"); chunks.push(c); }
  const raw = Buffer.concat(chunks).toString("utf8");
  try { return JSON.parse(raw || "{}"); } catch { return raw; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const file = ROUTES[url.pathname];
  // Lớp tương thích kiểu Vercel: res.status(n).json(obj)
  res.status = n => { res.statusCode = n; return res; };
  res.json = o => { if (!res.headersSent) res.setHeader("content-type", "application/json; charset=utf-8"); res.end(JSON.stringify(o)); return res; };
  if (url.pathname.startsWith("/storage/v1/")) { if (!storage) return res.status(503).json({ error: "Chưa đặt JWT_SECRET" }); return storage(req, res, url); }
  if (url.pathname === "/api/health") return res.status(200).json({ ok: true, time: new Date().toISOString() });
  if (!file) return res.status(404).json({ ok: false, error: "not found" });
  try {
    req.query = Object.fromEntries(url.searchParams);
    req.body = await readBody(req, url.pathname === "/api/restore" ? 300 * 1024 * 1024 : 1_000_000);
    if (!cache.has(file)) cache.set(file, (await import(pathToFileURL(path.join(API_DIR, file)).href)).default);
    await cache.get(file)(req, res);
    if (!res.writableEnded) res.end();
  } catch (e) {
    console.error(new Date().toISOString(), url.pathname, e);
    if (!res.headersSent) res.status(500).json({ ok: false, error: String((e && e.message) || e).slice(0, 200) }); else res.end();
  }
});
server.listen(PORT, "127.0.0.1", () => console.log(`qlcv-api lắng nghe 127.0.0.1:${PORT}, API_DIR=${API_DIR}`));
