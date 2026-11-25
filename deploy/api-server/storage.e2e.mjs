import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
const secret = "test-secret-1234567890";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = role => { const h = b64({ alg: "HS256", typ: "JWT" }), p = b64({ role, iss: "qlcv", exp: Math.floor(Date.now() / 1000) + 3600 }); return `${h}.${p}.${createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url")}`; };
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stor-"));
const srv = spawn("node", ["deploy/api-server/server.js"], { env: { ...process.env, API_PORT: "3066", JWT_SECRET: secret, STORAGE_DIR: dir }, stdio: "inherit" });
await new Promise(r => setTimeout(r, 1500));
const base = "http://127.0.0.1:3066";
let ok = 0, bad = 0; const t = (n, c) => { c ? ok++ : (bad++, console.log("FAIL", n)); };
try {
  const anon = createClient(base, jwt("anon"));
  // 1) supabase-js upload (multipart) + getPublicUrl, đúng như giao diện
  const file = new File([Buffer.from("xin chào PDF")], "bao cao.pdf", { type: "application/pdf" });
  let r = await anon.storage.from("attachments").upload("abc123_bao-cao.pdf", file);
  t("upload supabase-js", !r.error && r.data?.path === "abc123_bao-cao.pdf"); if (r.error) console.log(r.error);
  const { data: { publicUrl } } = anon.storage.from("attachments").getPublicUrl("abc123_bao-cao.pdf");
  t("publicUrl đúng dạng", publicUrl === `${base}/storage/v1/object/public/attachments/abc123_bao-cao.pdf`);
  const g = await fetch(publicUrl); t("GET công khai 200 + nội dung", g.status === 200 && (await g.text()) === "xin chào PDF" && g.headers.get("content-type") === "application/pdf");
  // 2) trùng tên → giao diện nhận ra qua statusCode 409 / "already exists"
  r = await anon.storage.from("attachments").upload("abc123_bao-cao.pdf", file);
  t("trùng tên báo 409/exists", r.error && (String(r.error.statusCode) === "409" || /exists/i.test(r.error.message))); if (!r.error) console.log("no error?"); 
  // 3) upload thô (sync_vanban.py) + upsert
  let x = await fetch(`${base}/storage/v1/object/attachments/raw.txt`, { method: "POST", headers: { Authorization: "Bearer " + jwt("service_role"), "Content-Type": "text/plain" }, body: "abc" });
  t("upload thô 200", x.status === 200);
  x = await fetch(`${base}/storage/v1/object/attachments/raw.txt`, { method: "POST", headers: { Authorization: "Bearer " + jwt("service_role"), "x-upsert": "true" }, body: "abcd" });
  t("upsert 200", x.status === 200 && (await (await fetch(`${base}/storage/v1/object/public/attachments/raw.txt`)).text()) === "abcd");
  // 4) quyền
  x = await fetch(`${base}/storage/v1/object/attachments/n.txt`, { method: "POST", body: "z" }); t("không khóa → 401", x.status === 401);
  x = await fetch(`${base}/storage/v1/object/list/attachments`, { method: "POST", headers: { Authorization: "Bearer " + jwt("anon"), "content-type": "application/json" }, body: "{}" }); t("anon không được liệt kê", x.status === 403);
  x = await fetch(`${base}/storage/v1/object/list/attachments`, { method: "POST", headers: { Authorization: "Bearer " + jwt("service_role"), "content-type": "application/json" }, body: JSON.stringify({ prefix: "", limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } }) });
  const ls = await x.json(); t("service_role liệt kê", x.status === 200 && ls.length === 2 && ls[0].metadata.size > 0 && ls.map(o => o.name).join() === "abc123_bao-cao.pdf,raw.txt");
  // 5) chống đường dẫn lạ + SVG phải tải xuống
  x = await fetch(`${base}/storage/v1/object/public/attachments/..%2F..%2Fetc%2Fpasswd`); t("chặn ../", x.status === 404);
  x = await fetch(`${base}/storage/v1/object/attachments/..%2Fx.txt`, { method: "POST", headers: { Authorization: "Bearer " + jwt("service_role") }, body: "z" }); t("chặn ghi ../", x.status === 404);
  await fetch(`${base}/storage/v1/object/attachments/a.svg`, { method: "POST", headers: { Authorization: "Bearer " + jwt("service_role") }, body: "<svg onload=alert(1)/>" });
  x = await fetch(`${base}/storage/v1/object/public/attachments/a.svg`); t("SVG ép tải xuống", /attachment/.test(x.headers.get("content-disposition") || ""));
  // 6) Range + xóa
  x = await fetch(publicUrl, { headers: { range: "bytes=0-2" } }); t("Range 206", x.status === 206);
  x = await fetch(`${base}/storage/v1/object/attachments`, { method: "DELETE", headers: { Authorization: "Bearer " + jwt("service_role"), "content-type": "application/json" }, body: JSON.stringify({ prefixes: ["raw.txt"] }) });
  t("xóa nhiều", x.status === 200 && (await x.json()).length === 1 && (await fetch(`${base}/storage/v1/object/public/attachments/raw.txt`)).status === 404);
  // 7) khóa giả bị từ chối
  x = await fetch(`${base}/storage/v1/object/attachments/f.txt`, { method: "POST", headers: { Authorization: "Bearer " + jwt("anon").slice(0, -3) + "abc" }, body: "z" }); t("khóa giả → 401", x.status === 401);
} finally { srv.kill(); fs.rmSync(dir, { recursive: true, force: true }); }
console.log(`Kết quả: ${ok} đạt, ${bad} lỗi`); process.exit(bad ? 1 : 0);
