#!/usr/bin/env bash
# DỰNG CẤU TRÚC CƠ SỞ DỮ LIỆU MỚI (chạy TRÊN MÁY CHỦ, bằng root, sau khi CSDL Docker đã chạy). Chỉ chạy trên CSDL TRỐNG.
#   bash /opt/qlcv/app/deploy/db/apply-schema.sh
# Tạo toàn bộ bảng, hàm đăng nhập/quản trị, quyền theo từng bảng/cột, danh mục sản phẩm chuẩn KPI, 3 phòng mặc định.
set -euo pipefail
DB=qlcv-db
SCHEMA="$(cd "$(dirname "$0")" && pwd)/schema.sql"
docker ps --format '{{.Names}}' | grep -qx "$DB" || { echo "Không thấy container $DB — chạy: cd /opt/qlcv/stack && docker compose up -d"; exit 1; }
EXISTS=$(docker exec -i "$DB" psql -U postgres -d postgres -Atc "select to_regclass('public.tasks') is not null")
if [ "$EXISTS" = "t" ]; then echo "CSDL ĐÃ có dữ liệu/cấu trúc (bảng tasks tồn tại) — dừng để tránh ghi đè. Muốn dựng lại từ đầu: xóa /opt/qlcv/pgdata và khởi động lại (MẤT hết dữ liệu)."; exit 1; fi
docker exec -i "$DB" psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$SCHEMA"
docker exec -i "$DB" psql -U postgres -d postgres -c "notify pgrst, 'reload schema';" >/dev/null
N=$(docker exec -i "$DB" psql -U postgres -d postgres -Atc "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'")
echo "Đã dựng xong CSDL: $N bảng. Bước tiếp theo: bash $(dirname "$SCHEMA")/seed-admin.sh"
