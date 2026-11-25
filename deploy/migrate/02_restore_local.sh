#!/usr/bin/env bash
# BƯỚC 2 — Nạp file xuất ở bước 1 vào Postgres của Supabase tự chạy (chạy TRÊN MÁY CHỦ, bằng root).
#   bash deploy/migrate/02_restore_local.sh qlcv-cloud-YYYYMMDD-HHMM.sql
set -euo pipefail
FILE="${1:?Cú pháp: 02_restore_local.sh <file.sql>}"
DB=supabase-db
docker ps --format '{{.Names}}' | grep -qx "$DB" || { echo "Không thấy container $DB — Supabase đã chạy chưa? (docker compose ps trong /opt/qlcv/supabase)"; exit 1; }
echo "Làm sạch schema public rồi nạp lại (dữ liệu mẫu cũ nếu có sẽ mất)…"
docker exec -i "$DB" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "drop schema if exists public cascade; create schema public; grant usage on schema public to anon, authenticated, service_role; alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role; alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role; alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;"
# Nạp dữ liệu; hiển thị riêng các dòng LỖI (ERROR) nếu có
docker exec -i "$DB" psql -U postgres -d postgres < "$FILE" 2>&1 | grep -E "ERROR|FATAL" | head -40 || echo "Không có lỗi."
# Báo PostgREST đọc lại cấu trúc
docker exec -i "$DB" psql -U postgres -d postgres -c "notify pgrst, 'reload schema';" > /dev/null
echo "Xong. Chạy 05_verify.sh để đối chiếu số dòng với CSDL cũ."
