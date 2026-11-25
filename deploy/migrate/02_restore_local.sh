#!/usr/bin/env bash
# BƯỚC 2 — Nạp dữ liệu xuất ở bước 1 vào PostgreSQL trên máy chủ mới (chạy TRÊN MÁY CHỦ, bằng root).
#   bash deploy/migrate/02_restore_local.sh qlcv-cloud.sql        (tự dùng thêm qlcv-cloud.sql.roles.sql nếu có)
set -euo pipefail
FILE="${1:?Cú pháp: 02_restore_local.sh <file.sql>}"
DB=qlcv-db
docker ps --format '{{.Names}}' | grep -qx "$DB" || { echo "Không thấy container $DB — CSDL đã chạy chưa? (cd /opt/qlcv/stack && docker compose ps)"; exit 1; }
echo "Làm sạch schema public rồi nạp lại (dữ liệu cũ trong schema public sẽ mất)…"
docker exec -i "$DB" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "drop schema if exists public cascade; create schema public; grant usage on schema public to anon, authenticated, service_role;"
# Nạp dữ liệu; chỉ in các dòng LỖI (nếu có)
docker exec -i "$DB" psql -U postgres -d postgres < "$FILE" 2>&1 | grep -E "ERROR|FATAL" | head -40 || echo "Không có lỗi."
# Cấu hình theo vai trò (vd. kiểm tra mã ghi x-write-pin)
if [ -f "$FILE.roles.sql" ]; then
  echo "Áp dụng cấu hình vai trò từ $FILE.roles.sql"
  docker exec -i "$DB" psql -U postgres -d postgres < "$FILE.roles.sql"
else
  echo "CẢNH BÁO: không thấy $FILE.roles.sql — nếu hệ thống cũ có hàm check_write_pin gắn vào vai trò authenticator, phải tự áp dụng:"
  echo "  alter role authenticator set \"pgrst.db_pre_request\" to 'public.check_write_pin';"
fi
docker exec -i "$DB" psql -U postgres -d postgres -c "notify pgrst, 'reload config'; notify pgrst, 'reload schema';" > /dev/null
echo "Xong. Chạy 05_verify.sh để đối chiếu số dòng với CSDL cũ."
