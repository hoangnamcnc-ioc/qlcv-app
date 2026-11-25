// SAO LƯU / KHÔI PHỤC TOÀN BỘ DỮ LIỆU (chạy trên máy chủ bằng khóa service_role — đọc/ghi được cả cột bị khóa với khóa công khai).
// Dùng cho api/backup.js và api/restore.js. Chỉ Admin/Giám đốc (xác thực mật khẩu bằng hàm login của CSDL).

// Mọi bảng dữ liệu của ứng dụng + khóa chính (để khôi phục kiểu "trộn" và "thay thế").
export const BACKUP_TABLES = {
  departments: "code", employees: "id", users: "id", tasks: "id", comments: "id", recurring_templates: "id",
  other_tasks: "id", support_cases: "id", projects: "id", documents: "id", approval_delegations: "id",
  monthly_scores: "id", kpi_common: "id", kpi_catalog: "code", app_config: "key", duty_schedule: "date",
  chat_channels: "id", chat_messages: "id", chat_learning: "id", feedback: "id", login_history: "id",
};
export const BACKUP_FORMAT = "qlcv-backup";
export const BACKUP_VERSION = 1;

const cfg = () => {
  const base = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY || "";
  if (!base || !key) throw new Error("Thiếu SUPABASE_URL / SUPABASE_SERVICE_KEY trên máy chủ (api.env)");
  return { base, key };
};
const hdr = (key, extra = {}) => ({ apikey: key, Authorization: "Bearer " + key, "content-type": "application/json", ...extra });

// Xác thực tài khoản bằng hàm login của CSDL; chỉ cho admin/director. Chặn dò mật khẩu: 5 lần sai / 10 phút / địa chỉ.
const fails = new Map();
export async function verifyAdmin(username, password, ip = "?") {
  const now = Date.now(); const f = (fails.get(ip) || []).filter(t => now - t < 600000);
  if (f.length >= 5) return { ok: false, status: 429, error: "Sai quá nhiều lần — thử lại sau 10 phút" };
  if (!username || !password) return { ok: false, status: 400, error: "Nhập tên đăng nhập và mật khẩu" };
  const { base, key } = cfg();
  const r = await fetch(`${base}/rest/v1/rpc/login`, { method: "POST", headers: hdr(key), body: JSON.stringify({ p_username: username, p_password: password }) });
  const d = r.ok ? await r.json() : null; const u = Array.isArray(d) ? d[0] : d;
  if (!u || !u.role) { fails.set(ip, [...f, now]); return { ok: false, status: 401, error: "Sai tên đăng nhập hoặc mật khẩu" }; }
  if (!["admin", "director"].includes(u.role)) return { ok: false, status: 403, error: "Chỉ Admin/Giám đốc được sao lưu/khôi phục" };
  return { ok: true, user: u };
}

// Đọc toàn bộ 1 bảng (phân trang 1000 dòng — giới hạn của PostgREST)
async function readAll(base, key, table, pk) {
  const out = [];
  for (let off = 0; ; off += 1000) {
    const r = await fetch(`${base}/rest/v1/${table}?select=*&order=${pk}&limit=1000&offset=${off}`, { headers: hdr(key) });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      if (r.status === 404 || /does not exist|schema cache|Could not find the table/i.test(t)) return null; // bảng chưa có (CSDL cũ hơn) → bỏ qua
      throw new Error(`${table}: HTTP ${r.status} ${t.slice(0, 120)}`);
    }
    const page = await r.json(); out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

export async function exportAll() {
  const { base, key } = cfg();
  const tables = {}, counts = {}, skipped = [];
  for (const [t, pk] of Object.entries(BACKUP_TABLES)) {
    const rows = await readAll(base, key, t, pk);
    if (rows === null) { skipped.push(t); continue; }
    tables[t] = rows; counts[t] = rows.length;
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exported_at: new Date().toISOString(), counts, skipped, tables };
}

// Kiểm tra tệp sao lưu (không ghi gì). Trả { ok, error?, counts }
export function validateBackup(b) {
  if (!b || b.format !== BACKUP_FORMAT) return { ok: false, error: "Không phải tệp sao lưu của QLCV" };
  if (b.version !== BACKUP_VERSION) return { ok: false, error: `Phiên bản tệp (${b.version}) không được hỗ trợ` };
  if (!b.tables || typeof b.tables !== "object") return { ok: false, error: "Tệp không có dữ liệu" };
  const counts = {};
  for (const [t, rows] of Object.entries(b.tables)) {
    if (!(t in BACKUP_TABLES)) return { ok: false, error: `Bảng lạ trong tệp: ${t}` };
    if (!Array.isArray(rows)) return { ok: false, error: `Dữ liệu bảng ${t} không hợp lệ` };
    counts[t] = rows.length;
  }
  return { ok: true, counts };
}

// mode "merge": thêm/cập nhật theo khóa chính, KHÔNG xóa dòng nào.  mode "replace": xóa sạch các bảng có trong tệp rồi nạp lại.
export async function restoreAll(backup, mode) {
  const v = validateBackup(backup); if (!v.ok) throw new Error(v.error);
  if (!["merge", "replace"].includes(mode)) throw new Error("Chế độ không hợp lệ");
  const { base, key } = cfg();
  const result = {};
  // Thứ tự: danh mục/nhân viên/tài khoản trước, dữ liệu phụ thuộc sau (không có khóa ngoại nhưng giữ cho dễ đọc)
  const order = Object.keys(BACKUP_TABLES).filter(t => t in backup.tables);
  if (mode === "replace") {
    for (const t of [...order].reverse()) {
      const pk = BACKUP_TABLES[t];
      const r = await fetch(`${base}/rest/v1/${t}?${pk}=not.is.null`, { method: "DELETE", headers: hdr(key, { Prefer: "return=minimal" }) });
      if (!r.ok) throw new Error(`Xóa bảng ${t} thất bại: HTTP ${r.status} ${(await r.text().catch(() => "")).slice(0, 120)}`);
    }
  }
  for (const t of order) {
    const rows = backup.tables[t]; let n = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const r = await fetch(`${base}/rest/v1/${t}`, { method: "POST", headers: hdr(key, { Prefer: "resolution=merge-duplicates,return=minimal" }), body: JSON.stringify(chunk) });
      if (!r.ok) throw new Error(`Nạp bảng ${t} thất bại ở dòng ${i + 1}: HTTP ${r.status} ${(await r.text().catch(() => "")).slice(0, 160)}`);
      n += chunk.length;
    }
    result[t] = n;
  }
  return result;
}
