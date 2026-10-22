// Đọc dữ liệu từ Supabase bằng khóa service_role (CHỈ chạy trên máy chủ Vercel — biến SUPABASE_SERVICE_KEY, không bao giờ ra trình duyệt).
// PHÂN TRANG bắt buộc: PostgREST chỉ trả tối đa 1000 dòng/lần, bảng tasks đã >2000 dòng.
const base = () => (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const key = () => process.env.SUPABASE_SERVICE_KEY || "";

export async function getAll(table, select, order = "id") {
  if (!base() || !key()) throw new Error("Thiếu SUPABASE_URL / SUPABASE_SERVICE_KEY trên Vercel");
  const out = []; let off = 0;
  for (;;) {
    const r = await fetch(`${base()}/rest/v1/${table}?select=${select}&limit=1000&offset=${off}&order=${order}`, { headers: { apikey: key(), Authorization: "Bearer " + key() } });
    if (!r.ok) throw new Error(`${table}: HTTP ${r.status} ${(await r.text().catch(() => "")).slice(0, 120)}`);
    const pg = await r.json(); out.push(...pg); off += pg.length;
    if (pg.length < 1000) break;
  }
  return out;
}

export async function loadDigestData() {
  const [users, employees, tasks, depts, cfg, duty] = await Promise.all([
    getAll("users", "id,username,full_name,role,employee_id,email"),
    getAll("employees", "id,name,dept,role,oversees_dept"),
    getAll("tasks", "id,title,eid,dept,deadline,completed,deleted,pending_create,create_rejected,completion_requested,template_id,weight"),
    getAll("departments", "code,name", "code").catch(() => []),
    getAll("app_config", "key,value", "key").catch(() => []),
    getAll("duty_schedule", "date,leader,dc,ioc,note", "date"),
  ]);
  let holidays = [];
  const h = cfg.find(r => r.key === "holidays");
  if (h) { try { const x = JSON.parse(h.value || "[]"); if (Array.isArray(x)) holidays = x; } catch { /* bỏ qua */ } }
  const deptNames = Object.fromEntries(depts.map(d => [d.code, d.name]));
  return { users, employees, tasks, holidays, deptNames, duty };
}

export const maskEmail = e => { const [u, d = ""] = String(e).split("@"); return `${u.slice(0, 2)}***@${d}`; };
