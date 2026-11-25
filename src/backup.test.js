import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { BACKUP_TABLES, exportAll, restoreAll, validateBackup, verifyAdmin } from "../api/_lib/backup.js";

// Máy chủ giả lập PostgREST tối thiểu: rpc/login, GET có phân trang, POST (merge), DELETE
function fakeRest(initial) {
  const db = JSON.parse(JSON.stringify(initial));
  const log = [];
  const srv = http.createServer(async (req, res) => {
    const u = new URL(req.url, "http://x"); const parts = u.pathname.split("/").filter(Boolean); // rest v1 <name...>
    const name = parts[3] === "login" ? "login" : parts[2];
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null;
    const send = (code, o) => { res.statusCode = code; res.setHeader("content-type", "application/json"); res.end(JSON.stringify(o)); };
    if (u.pathname.endsWith("/rpc/login")) {
      const ok = body.p_username === "admin" && body.p_password === "good"; const dir = body.p_username === "director" && body.p_password === "good"; const st = body.p_username === "staff" && body.p_password === "good";
      return send(200, ok ? [{ id: "u1", username: "admin", role: "admin" }] : dir ? [{ id: "u2", username: "director", role: "director" }] : st ? [{ id: "u3", username: "staff", role: "staff" }] : []);
    }
    if (!(name in db)) return send(404, { message: `Could not find the table 'public.${name}' in the schema cache` });
    const pk = BACKUP_TABLES[name];
    log.push(`${req.method} ${name}`);
    if (req.method === "GET") { const off = Number(u.searchParams.get("offset") || 0), lim = Number(u.searchParams.get("limit") || 1000); return send(200, db[name].slice(off, off + lim)); }
    if (req.method === "DELETE") { db[name] = []; return send(204, {}); }
    if (req.method === "POST") { for (const row of body) { const i = db[name].findIndex(r => r[pk] === row[pk]); if (i >= 0) db[name][i] = row; else db[name].push(row); } return send(201, {}); }
    send(405, {});
  });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r({ srv, db, log, url: `http://127.0.0.1:${srv.address().port}` })));
}

const seed = () => {
  const o = {};
  for (const t of Object.keys(BACKUP_TABLES)) o[t] = [];
  o.tasks = Array.from({ length: 2300 }, (_, i) => ({ id: "t" + i, title: "Việc " + i }));
  o.users = [{ id: "u1", username: "admin", password: "h$abc", role: "admin" }];
  o.employees = [{ id: "e1", name: "A", hr: "{\"dob\":\"1990\"}" }];
  o.app_config = [{ key: "kpi_ontime", value: "85" }];
  delete o.kpi_common; // CSDL cũ chưa có bảng này
  return o;
};

test("xuất toàn bộ: phân trang >1000 dòng, đủ cột nhạy cảm, bỏ qua bảng chưa có", async () => {
  const f = await fakeRest(seed());
  process.env.SUPABASE_URL = f.url; process.env.SUPABASE_SERVICE_KEY = "svc";
  const b = await exportAll();
  assert.equal(b.tables.tasks.length, 2300); assert.equal(b.counts.tasks, 2300);
  assert.equal(b.tables.users[0].password, "h$abc"); assert.ok(b.tables.employees[0].hr);
  assert.deepEqual(b.skipped, ["kpi_common"]);
  assert.equal(validateBackup(b).ok, true);
  f.srv.close();
});

test("khôi phục: trộn không xóa, thay thế xóa rồi nạp lại, nạp theo lô 500", async () => {
  const src = await fakeRest(seed());
  process.env.SUPABASE_URL = src.url; process.env.SUPABASE_SERVICE_KEY = "svc";
  const backup = await exportAll(); src.srv.close();
  const dst = await fakeRest({ ...seed(), tasks: [{ id: "keep", title: "Giữ" }, { id: "t5", title: "Cũ" }] });
  process.env.SUPABASE_URL = dst.url;
  const r1 = await restoreAll(backup, "merge");
  assert.equal(r1.tasks, 2300); assert.equal(dst.db.tasks.length, 2301); // "keep" vẫn còn
  assert.equal(dst.db.tasks.find(t => t.id === "t5").title, "Việc 5"); // bị ghi đè bằng bản sao lưu
  assert.equal(dst.log.filter(l => l === "DELETE tasks").length, 0);
  assert.equal(dst.log.filter(l => l === "POST tasks").length, 5); // 2300 / 500 = 5 lô
  const r2 = await restoreAll(backup, "replace");
  assert.equal(dst.db.tasks.length, 2300); assert.ok(!dst.db.tasks.some(t => t.id === "keep"));
  assert.ok(dst.log.includes("DELETE tasks"));
  assert.equal(r2.users, 1);
  dst.srv.close();
});

test("kiểm tra tệp: sai định dạng/phiên bản/bảng lạ bị từ chối", () => {
  assert.equal(validateBackup(null).ok, false);
  assert.equal(validateBackup({ format: "khac" }).ok, false);
  assert.equal(validateBackup({ format: "qlcv-backup", version: 99, tables: {} }).ok, false);
  assert.equal(validateBackup({ format: "qlcv-backup", version: 1, tables: { hack: [] } }).ok, false);
  assert.equal(validateBackup({ format: "qlcv-backup", version: 1, tables: { tasks: "x" } }).ok, false);
  assert.equal(validateBackup({ format: "qlcv-backup", version: 1, tables: { tasks: [] } }).ok, true);
});

test("xác thực: chỉ admin/director; sai quá 5 lần bị khóa tạm", async () => {
  const f = await fakeRest(seed());
  process.env.SUPABASE_URL = f.url; process.env.SUPABASE_SERVICE_KEY = "svc";
  assert.equal((await verifyAdmin("admin", "good", "1.1.1.1")).ok, true);
  assert.equal((await verifyAdmin("director", "good", "1.1.1.1")).ok, true);
  const st = await verifyAdmin("staff", "good", "1.1.1.1"); assert.equal(st.ok, false); assert.equal(st.status, 403);
  for (let i = 0; i < 5; i++) assert.equal((await verifyAdmin("admin", "sai", "2.2.2.2")).status, 401);
  assert.equal((await verifyAdmin("admin", "good", "2.2.2.2")).status, 429); // bị khóa dù đúng mật khẩu
  assert.equal((await verifyAdmin("", "", "3.3.3.3")).status, 400);
  f.srv.close();
});
