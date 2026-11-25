# Sinh lại deploy/db/schema.sql từ các file trong supabase/ (chạy từ thư mục gốc dự án: python3 deploy/db/build-schema.py)
import re, glob, os

def rd(p): return open(p, encoding="utf-8").read().replace("\r\n", "\n")
seed = rd("supabase/99-demo-schema-seed.sql").split("\n")

def idem(sql):
    # create table X ( -> create table if not exists public.X (
    sql = re.sub(r"(?im)^(\s*)create\s+table\s+(?!if\s+not\s+exists)(?:public\.)?(\w+)", r"\1create table if not exists public.\2", sql)
    sql = re.sub(r"(?im)^(\s*)create\s+table\s+if\s+not\s+exists\s+(?!public\.)(\w+)", r"\1create table if not exists public.\2", sql)
    return sql

out = []
out.append("""-- ============================================================
--  QLCV — LƯỢC ĐỒ CƠ SỞ DỮ LIỆU CHO CÀI MỚI (không có dữ liệu cũ)
--  Tự sinh bằng deploy/db/build-schema.py từ: bảng nền (supabase/99) + các file đánh số 02..51 (theo thứ tự) + bước hoàn thiện quyền.
--  Chạy MỘT LẦN trên CSDL trống (deploy/db/apply-schema.sh). KHÔNG chạy trên CSDL đang có dữ liệu thật.
-- ============================================================
""")
# 1) bảng nền (dòng 7..93 của file demo, bỏ dữ liệu mẫu và hàm đăng nhập cũ)
base = "\n".join(seed[6:93])
out.append("-- ───────── 1. BẢNG NỀN ─────────\n" + idem(base) + "\n")
# 2) quyền nền
out.append("-- ───────── 2. QUYỀN NỀN CHO anon ─────────\n" + "\n".join(seed[93:102]) + "\n")
# 3) các file đánh số theo thứ tự
skip = {"01", "41", "46", "99"}
files = sorted(glob.glob("supabase/[0-9][0-9]*.sql"))
def key(f):
    b = os.path.basename(f); m = re.match(r"(\d+)([a-z]?)", b); return (int(m.group(1)), m.group(2))
files.sort(key=key)
for f in files:
    b = os.path.basename(f); num = re.match(r"(\d+)", b).group(1)
    if num in skip: continue
    out.append(f"\n-- ───────── {b} ─────────\n" + idem(rd(f)))
# 4) hoàn thiện
out.append("""
-- ───────── HOÀN THIỆN ─────────
-- Hàm nội bộ không cho gọi từ API (mục (2) của file 46)
revoke all on function public._verify_admin(text, text) from public, anon, authenticated;

-- Tắt RLS trên mọi bảng (ứng dụng đăng nhập bằng RPC riêng; quyền cột/hàm do GRANT/REVOKE ở trên bảo vệ)
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I disable row level security', r.tablename);
  end loop;
end $$;

-- Khóa máy chủ (service_role) cần toàn quyền để API gửi email đọc dữ liệu
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

notify pgrst, 'reload schema';
""")
sql = "\n".join(out)
os.makedirs("deploy/db", exist_ok=True)
open("deploy/db/schema.sql", "w", encoding="utf-8", newline="\n").write(sql)
print(len(sql.split("\n")), "dòng;", len(files), "file đánh số")
