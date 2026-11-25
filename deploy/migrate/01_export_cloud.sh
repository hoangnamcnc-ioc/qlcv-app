#!/usr/bin/env bash
# BƯỚC 1 — Xuất toàn bộ dữ liệu từ hệ thống CŨ (Supabase đám mây): schema public (bảng + dữ liệu + hàm RPC + quyền) và cấu hình vai trò.
#   export CLOUD_DB_URL='postgresql://postgres:<MẬT_KHẨU_DB>@db.<mã-dự-án>.supabase.co:5432/postgres'
#   bash deploy/migrate/01_export_cloud.sh qlcv-cloud.sql        # tạo qlcv-cloud.sql và qlcv-cloud.sql.roles.sql
# Mật khẩu DB: Supabase > Project Settings > Database (có nút Reset password). Nếu báo lỗi IPv6, dùng chuỗi "Session pooler" cùng trang đó.
set -euo pipefail
: "${CLOUD_DB_URL:?Chưa đặt CLOUD_DB_URL}"
OUT="${1:-qlcv-cloud-$(date +%Y%m%d-%H%M).sql}"
pg_dump "$CLOUD_DB_URL" --schema=public --no-owner --format=plain --quote-all-identifiers --file="$OUT"
# Cấu hình theo vai trò (vd. pgrst.db_pre_request = hàm kiểm tra mã ghi x-write-pin) — KHÔNG nằm trong bản xuất schema public
psql "$CLOUD_DB_URL" -At -c "
  select format('alter role %I set %I to %L;', r.rolname, split_part(c, '=', 1), substr(c, strpos(c, '=') + 1))
    from pg_roles r, unnest(r.rolconfig) c
   where r.rolname in ('anon', 'authenticated', 'service_role', 'authenticator')
     and split_part(c, '=', 1) not in ('search_path')" > "$OUT.roles.sql"
ls -lh "$OUT" "$OUT.roles.sql"
echo "--- Cấu hình vai trò sẽ được áp dụng ở máy mới:"; cat "$OUT.roles.sql"
echo "Đã xuất. Hai file chứa dữ liệu thật + mật khẩu đã băm — GIỮ KÍN, đừng gửi qua kênh công khai."
