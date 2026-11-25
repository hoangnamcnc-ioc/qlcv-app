#!/usr/bin/env bash
# BƯỚC 5 — Đối chiếu số dòng từng bảng giữa CSDL cũ (đám mây) và mới (máy chủ). Chạy TRÊN MÁY CHỦ.
#   export CLOUD_DB_URL='postgresql://postgres:...@db.<mã>.supabase.co:5432/postgres'
set -euo pipefail
: "${CLOUD_DB_URL:?Chưa đặt CLOUD_DB_URL}"
count_tables() {
  local run="$1"
  for t in $($run -Atc "select tablename from pg_tables where schemaname='public' order by 1"); do
    printf '%s|%s\n' "$t" "$($run -Atc "select count(*) from public.\"$t\"")"
  done
}
cloud() { psql "$CLOUD_DB_URL" "$@"; }
local_db() { docker exec -i qlcv-db psql -U postgres -d postgres "$@"; }
count_tables cloud > /tmp/cloud_counts.txt
count_tables local_db > /tmp/local_counts.txt
if diff -q /tmp/cloud_counts.txt /tmp/local_counts.txt > /dev/null; then
  echo "✅ Số dòng KHỚP hoàn toàn ($(wc -l < /tmp/local_counts.txt) bảng)"
else
  echo "❌ Có bảng lệch số dòng (trái = đám mây, phải = máy chủ mới):"
  diff /tmp/cloud_counts.txt /tmp/local_counts.txt || true
  exit 1
fi
