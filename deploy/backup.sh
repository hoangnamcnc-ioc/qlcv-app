#!/usr/bin/env bash
# SAO LƯU HẰNG ĐÊM: cơ sở dữ liệu (nén) + kho file đính kèm. Giữ 14 bản CSDL gần nhất. Chạy bằng cron (xem crontab.example).
# NÊN chép thư mục /var/backups/qlcv sang nơi KHÁC máy chủ này (ổ ngoài, máy khác, đám mây) — sao lưu cùng máy chưa đủ an toàn.
set -euo pipefail
DIR=/var/backups/qlcv
mkdir -p "$DIR/db" "$DIR/storage"
STAMP=$(date +%Y%m%d-%H%M)
docker exec supabase-db pg_dump -U postgres -d postgres --schema=public --no-owner | gzip > "$DIR/db/qlcv-$STAMP.sql.gz"
rsync -a --delete /opt/qlcv/supabase/volumes/storage/ "$DIR/storage/"
find "$DIR/db" -name 'qlcv-*.sql.gz' -mtime +14 -delete
echo "$(date) sao lưu xong: $(du -sh "$DIR" | cut -f1)"
