// KHO FILE ĐÍNH KÈM tự chạy — thay Supabase Storage. Giữ NGUYÊN giao thức /storage/v1/... nên giao diện (supabase-js) và các script
// (cleanup_storage.py, sync_vanban.py) dùng tiếp không phải sửa. File lưu thẳng trên đĩa: $STORAGE_DIR/<bucket>/<đường-dẫn>.
//
// Quyền (JWT HS256 ký bằng JWT_SECRET — cùng khóa với PostgREST):
//   • tải lên: khóa anon hoặc service_role      • xem công khai: bucket công khai, KHÔNG cần khóa
//   • tải về có xác thực / HEAD: anon hoặc service_role      • liệt kê, xóa, tạo bucket: chỉ service_role
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import Busboy from "busboy";

export function createStorage({ dir, jwtSecret, maxBytes = 100 * 1024 * 1024 }) {
  const ROOT = path.resolve(dir);
  const BUCKETS_FILE = path.join(ROOT, ".buckets.json");
  fs.mkdirSync(ROOT, { recursive: true });
  const loadBuckets = () => { try { return JSON.parse(fs.readFileSync(BUCKETS_FILE, "utf8")); } catch { return {}; } };
  const saveBuckets = b => fs.writeFileSync(BUCKETS_FILE, JSON.stringify(b, null, 2));
  if (!Object.keys(loadBuckets()).length) saveBuckets({ attachments: { public: true, created_at: new Date().toISOString() } });

  const MIME = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".txt": "text/plain; charset=utf-8", ".csv": "text/csv; charset=utf-8", ".json": "application/json", ".zip": "application/zip", ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".xls": "application/vnd.ms-excel", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".ppt": "application/vnd.ms-powerpoint", ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation", ".mp4": "video/mp4", ".mp3": "audio/mpeg" };
  const FORCE_DOWNLOAD = new Set([".html", ".htm", ".svg", ".xml", ".js", ".mjs", ".xhtml"]); // tránh chạy mã/XSS khi mở file người dùng tải lên
  const mimeOf = p => MIME[path.extname(p).toLowerCase()] || "application/octet-stream";

  const send = (res, code, obj) => { res.statusCode = code; res.setHeader("content-type", "application/json; charset=utf-8"); res.end(JSON.stringify(obj)); };
  const err = (res, code, error, message) => send(res, code, { statusCode: String(code), error, message });

  // ── JWT ──
  function role(req) {
    const tok = ((req.headers.authorization || "").replace(/^Bearer\s+/i, "") || req.headers.apikey || "").toString();
    const p = tok.split(".");
    if (p.length !== 3) return null;
    try {
      const sig = crypto.createHmac("sha256", jwtSecret).update(`${p[0]}.${p[1]}`).digest();
      const given = Buffer.from(p[2], "base64url");
      if (sig.length !== given.length || !crypto.timingSafeEqual(sig, given)) return null;
      const pl = JSON.parse(Buffer.from(p[1], "base64url").toString("utf8"));
      if (pl.exp && pl.exp < Date.now() / 1000) return null;
      return pl.role || null;
    } catch { return null; }
  }

  // ── Đường dẫn an toàn (chống ../ và ký tự lạ) ──
  function safe(bucket, rel) {
    const b = loadBuckets();
    if (!/^[A-Za-z0-9_-]{1,63}$/.test(bucket) || !b[bucket]) return null;
    const parts = rel.split("/").filter(s => s !== "");
    if (parts.some(s => s === "." || s === ".." || s.includes("\0") || s.includes("\\"))) return null;
    const full = path.resolve(ROOT, bucket, ...parts);
    if (!full.startsWith(path.resolve(ROOT, bucket) + path.sep) && full !== path.resolve(ROOT, bucket)) return null;
    return { bucket, public: !!b[bucket].public, rel: parts.join("/"), full };
  }
  const readJson = async req => { const c = []; let n = 0; for await (const x of req) { n += x.length; if (n > 1e6) throw new Error("body lớn"); c.push(x); } try { return JSON.parse(Buffer.concat(c).toString() || "{}"); } catch { return {}; } };

  async function writeFile(req, res, target, upsert) {
    if (!upsert && fs.existsSync(target.full)) return err(res, 400, "Duplicate", "The resource already exists");
    await fsp.mkdir(path.dirname(target.full), { recursive: true });
    const tmp = `${target.full}.${crypto.randomBytes(6).toString("hex")}.part`;
    let size = 0, done = false;
    const finish = async ok => {
      if (done) return; done = true;
      if (!ok) { fsp.rm(tmp, { force: true }); return; }
      await fsp.rename(tmp, target.full);
      send(res, 200, { Key: `${target.bucket}/${target.rel}`, Id: crypto.randomUUID() });
    };
    const fail = (code, e, m) => { if (done) return; done = true; fsp.rm(tmp, { force: true }); err(res, code, e, m); };
    const ctype = (req.headers["content-type"] || "").toLowerCase();
    if (ctype.startsWith("multipart/form-data")) {
      const bb = Busboy({ headers: req.headers, limits: { fileSize: maxBytes, files: 1 } });
      let got = false;
      bb.on("file", (_n, stream) => {
        got = true;
        const out = fs.createWriteStream(tmp);
        stream.on("limit", () => { out.destroy(); fail(413, "Payload too large", "The object exceeded the maximum allowed size"); });
        stream.pipe(out);
        out.on("finish", () => { if (!done) finish(true).catch(e => fail(500, "Internal", String(e.message))); });
        out.on("error", e => fail(500, "Internal", String(e.message)));
      });
      bb.on("close", () => { if (!got) fail(400, "Bad Request", "Không có file trong yêu cầu"); });
      bb.on("error", e => fail(400, "Bad Request", String(e.message)));
      req.pipe(bb);
    } else {
      const out = fs.createWriteStream(tmp);
      req.on("data", c => { size += c.length; if (size > maxBytes) { out.destroy(); req.destroy(); fail(413, "Payload too large", "The object exceeded the maximum allowed size"); } });
      req.pipe(out);
      out.on("finish", () => finish(true).catch(e => fail(500, "Internal", String(e.message))));
      out.on("error", e => fail(500, "Internal", String(e.message)));
    }
  }

  function serve(req, res, target, st) {
    const ext = path.extname(target.full).toLowerCase();
    res.setHeader("content-type", mimeOf(target.full));
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("cache-control", "public, max-age=3600");
    res.setHeader("accept-ranges", "bytes");
    res.setHeader("last-modified", st.mtime.toUTCString());
    res.setHeader("etag", `"${st.size}-${Math.floor(st.mtimeMs)}"`);
    if (FORCE_DOWNLOAD.has(ext)) res.setHeader("content-disposition", `attachment; filename="${path.basename(target.full).replace(/"/g, "")}"`);
    let start = 0, end = st.size - 1;
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (m && (m[1] || m[2])) {
      if (m[1]) { start = Number(m[1]); if (m[2]) end = Math.min(Number(m[2]), end); } else { start = Math.max(0, st.size - Number(m[2])); }
      if (start > end || start >= st.size) { res.statusCode = 416; res.setHeader("content-range", `bytes */${st.size}`); return res.end(); }
      res.statusCode = 206; res.setHeader("content-range", `bytes ${start}-${end}/${st.size}`);
    }
    res.setHeader("content-length", end - start + 1);
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(target.full, { start, end }).on("error", () => res.destroy()).pipe(res);
  }

  async function listDir(target, body) {
    const prefix = (body.prefix || "").replace(/^\/+|\/+$/g, "");
    const dirT = safe(target.bucket, prefix); if (!dirT) return [];
    let ents = []; try { ents = await fsp.readdir(dirT.full, { withFileTypes: true }); } catch { return []; }
    const items = [];
    for (const e of ents) {
      if (e.name.endsWith(".part") || e.name.startsWith(".")) continue;
      if (e.isDirectory()) items.push({ name: e.name, id: null, updated_at: null, created_at: null, last_accessed_at: null, metadata: null });
      else { const st = await fsp.stat(path.join(dirT.full, e.name)); items.push({ name: e.name, id: crypto.createHash("md5").update(prefix + "/" + e.name).digest("hex"), updated_at: st.mtime.toISOString(), created_at: st.birthtime.toISOString(), last_accessed_at: st.atime.toISOString(), metadata: { size: st.size, mimetype: mimeOf(e.name), cacheControl: "max-age=3600" } }); }
    }
    const col = body.sortBy?.column || "name", dir = body.sortBy?.order === "desc" ? -1 : 1;
    items.sort((a, b) => (String(a[col] ?? "") < String(b[col] ?? "") ? -1 : 1) * dir);
    const off = Number(body.offset) || 0, lim = Math.min(Number(body.limit) || 100, 1000);
    return items.slice(off, off + lim);
  }

  // Trả true nếu đã xử lý
  return async function handle(req, res, url) {
    const p = decodeURIComponent(url.pathname).replace(/^\/storage\/v1\/?/, "");
    const seg = p.split("/");
    try {
      // GET công khai: /object/public/<bucket>/<đường dẫn>
      if ((req.method === "GET" || req.method === "HEAD") && seg[0] === "object" && seg[1] === "public") {
        const t = safe(seg[2] || "", seg.slice(3).join("/"));
        if (!t || !t.public) return err(res, 404, "not_found", "Object not found");
        const st = await fsp.stat(t.full).catch(() => null);
        if (!st || !st.isFile()) return err(res, 404, "not_found", "Object not found");
        return serve(req, res, t, st);
      }
      const r = role(req);
      if (!r) return err(res, 401, "Unauthorized", "Missing or invalid token");
      const admin = r === "service_role", anyKey = admin || r === "anon" || r === "authenticated";
      // Bucket
      if (seg[0] === "bucket") {
        if (!admin) return err(res, 403, "Forbidden", "Chỉ service_role");
        const b = loadBuckets();
        if (req.method === "GET" && !seg[1]) return send(res, 200, Object.entries(b).map(([id, v]) => ({ id, name: id, public: !!v.public, created_at: v.created_at })));
        if (req.method === "POST") {
          const body = await readJson(req); const id = body.id || body.name;
          if (!/^[A-Za-z0-9_-]{1,63}$/.test(id || "")) return err(res, 400, "Invalid", "Tên bucket không hợp lệ");
          if (b[id]) return err(res, 400, "Duplicate", "The resource already exists");
          b[id] = { public: !!body.public, created_at: new Date().toISOString() }; saveBuckets(b); await fsp.mkdir(path.join(ROOT, id), { recursive: true });
          return send(res, 200, { name: id });
        }
        return err(res, 404, "not_found", "Not found");
      }
      if (seg[0] !== "object") return err(res, 404, "not_found", "Not found");
      // Liệt kê: POST /object/list/<bucket>
      if (seg[1] === "list" && req.method === "POST") {
        if (!admin) return err(res, 403, "Forbidden", "Chỉ service_role");
        const t = safe(seg[2] || "", ""); if (!t) return err(res, 404, "not_found", "Bucket not found");
        return send(res, 200, await listDir(t, await readJson(req)));
      }
      // Xóa nhiều: DELETE /object/<bucket>  body {prefixes:[...]}
      if (req.method === "DELETE" && seg.length === 2) {
        if (!admin) return err(res, 403, "Forbidden", "Chỉ service_role");
        const body = await readJson(req); const out = [];
        for (const name of Array.isArray(body.prefixes) ? body.prefixes : []) {
          const t = safe(seg[1], String(name)); if (!t || !t.rel) continue;
          if (await fsp.rm(t.full, { force: true }).then(() => true, () => false)) out.push({ name, bucket_id: seg[1] });
        }
        return send(res, 200, out);
      }
      const t = safe(seg[1] || "", seg.slice(2).join("/"));
      if (!t || !t.rel) return err(res, 404, "not_found", "Object not found");
      if (req.method === "POST" || req.method === "PUT") {
        if (!anyKey) return err(res, 403, "Forbidden", "Không có quyền tải lên");
        return await writeFile(req, res, t, String(req.headers["x-upsert"] || "").toLowerCase() === "true");
      }
      if (req.method === "GET" || req.method === "HEAD") {
        if (!anyKey) return err(res, 403, "Forbidden", "Không có quyền");
        const st = await fsp.stat(t.full).catch(() => null);
        if (!st || !st.isFile()) return err(res, 404, "not_found", "Object not found");
        return serve(req, res, t, st);
      }
      if (req.method === "DELETE") {
        if (!admin) return err(res, 403, "Forbidden", "Chỉ service_role");
        await fsp.rm(t.full, { force: true });
        return send(res, 200, { message: "Successfully deleted" });
      }
      return err(res, 405, "Method Not Allowed", "Not allowed");
    } catch (e) {
      console.error("storage:", e);
      if (!res.headersSent) err(res, 500, "Internal", String((e && e.message) || e).slice(0, 200));
    }
  };
}
