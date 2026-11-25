#!/usr/bin/env bash
# BƯỚC 1 — Xuất toàn bộ dữ liệu từ Supabase đám mây (schema public: bảng + dữ liệu + hàm RPC + quyền).
#   export CLOUD_DB_URL='postgresql://postgres:<MẬT_KHẨU_DB>@db.<mã-dự-án>.supabase.co:5432/postgres'
#   bash deploy/migrate/01_export_cloud.sh
# Mật khẩu DB: Supabase > Project Settings > Database (có nút Reset password). Nếu báo lỗi IPv6, dùng chuỗi "Session pooler" cùng trang đó.
set -euo pipefail
: "${CLOUD_DB_URL:?Chưa đặt CLOUD_DB_URL}"
OUT="${1:-qlcv-cloud-$(date +%Y%m%d-%H%M).sql}"
pg_dump "$CLOUD_DB_URL" --schema=public --no-owner --format=plain --quote-all-identifiers --file="$OUT"
ls -lh "$OUT"
echo "Đã xuất: $OUT  (chứa dữ liệu thật + mật khẩu đã băm — GIỮ KÍN, đừng gửi qua kênh công khai)"
