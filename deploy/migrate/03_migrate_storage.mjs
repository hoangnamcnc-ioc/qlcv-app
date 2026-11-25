// BƯỚC 3 — Chép TOÀN BỘ file đính kèm từ Supabase đám mây sang Storage của máy chủ mới (giữ nguyên đường dẫn/tên file).
//   CLOUD_URL=https://<mã>.supabase.co CLOUD_SERVICE_KEY=<service_role cũ> \
//   NEW_URL=https://qlcv.ten-mien.vn   NEW_SERVICE_KEY=<SERVICE_ROLE_KEY mới> \
//   node deploy/migrate/03_migrate_storage.mjs
// Chạy lại nhiều lần an toàn (bỏ qua file đã có). Nên chạy thêm 1 lần sau cùng để chép nốt file phát sinh.
const need = k => { const v = process.env[k]; if (!v) { console.error("Thiếu biến " + k); process.exit(1); } return v.replace(/\/$/, ""); };
const CLOUD = need("CLOUD_URL"), CK = need("CLOUD_SERVICE_KEY"), NEW = need("NEW_URL"), NK = need("NEW_SERVICE_KEY");
const hc = { apikey: CK, Authorization: "Bearer " + CK }, hn = { apikey: NK, Authorization: "Bearer " + NK };
const CONC = 4;

async function jget(url, h, init) {
  const r = await fetch(url, { ...init, headers: { ...h, "content-type": "application/json" } });
  if (!r.ok) throw new Error(`${r.status} ${url} ${(await r.text()).slice(0, 150)}`);
  return r.json();
}

async function listAll(bucket, prefix = "") {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await jget(`${CLOUD}/storage/v1/object/list/${bucket}`, hc, { method: "POST", body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }) });
    for (const o of page) {
      if (o.id === null) out.push(...await listAll(bucket, prefix + o.name + "/"));
      else out.push({ path: prefix + o.name, size: o.metadata?.size || 0 });
    }
    if (page.length < 1000) break;
  }
  return out;
}
const enc = p => p.split("/").map(encodeURIComponent).join("/");

const buckets = await jget(`${CLOUD}/storage/v1/bucket`, hc);
console.log("Bucket trên đám mây:", buckets.map(b => `${b.name}${b.public ? " (công khai)" : ""}`).join(", "));
let total = 0, copied = 0, skipped = 0, failed = 0, bytes = 0;
for (const b of buckets) {
  const r = await fetch(`${NEW}/storage/v1/bucket`, { method: "POST", headers: { ...hn, "content-type": "application/json" }, body: JSON.stringify({ id: b.id, name: b.name, public: b.public, file_size_limit: b.file_size_limit || null, allowed_mime_types: b.allowed_mime_types || null }) });
  if (!r.ok && !/already exists|Duplicate/i.test(await r.text())) console.warn("Không tạo được bucket", b.name, r.status);
  const files = await listAll(b.name);
  total += files.length;
  console.log(`[${b.name}] ${files.length} file`);
  let i = 0;
  const worker = async () => {
    for (;;) {
      const f = files[i++];
      if (!f) return;
      try {
        const head = await fetch(`${NEW}/storage/v1/object/${b.name}/${enc(f.path)}`, { method: "HEAD", headers: hn });
        if (head.ok) { skipped++; continue; }
        const d = await fetch(`${CLOUD}/storage/v1/object/${b.name}/${enc(f.path)}`, { headers: hc });
        if (!d.ok) throw new Error("tải " + d.status);
        const buf = Buffer.from(await d.arrayBuffer());
        const u = await fetch(`${NEW}/storage/v1/object/${b.name}/${enc(f.path)}`, { method: "POST", headers: { ...hn, "content-type": d.headers.get("content-type") || "application/octet-stream", "x-upsert": "true" }, body: buf });
        if (!u.ok) throw new Error("tải lên " + u.status + " " + (await u.text()).slice(0, 100));
        copied++; bytes += buf.length;
        if (copied % 50 === 0) console.log(`  đã chép ${copied} file (${(bytes / 1048576).toFixed(0)} MB)…`);
      } catch (e) { failed++; console.warn("  LỖI", f.path, String(e.message || e)); }
    }
  };
  await Promise.all(Array.from({ length: CONC }, worker));
}
console.log(`XONG: ${total} file | chép mới ${copied} (${(bytes / 1048576).toFixed(1)} MB) | đã có ${skipped} | lỗi ${failed}`);
if (failed) process.exit(2);
