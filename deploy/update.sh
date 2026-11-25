#!/usr/bin/env bash
# CẬP NHẬT GIAO DIỆN trên máy chủ: kéo mã mới, build, thay bản chạy. Chạy bằng root/sudo:  bash /opt/qlcv/app/deploy/update.sh
# Cần file /etc/qlcv/web.env (VITE_SUPABASE_URL, VITE_SUPABASE_KEY, VITE_WRITE_PIN) — xem README_CHUYEN_HOST.md.
set -euo pipefail
APP=/opt/qlcv/app
[ -f /etc/qlcv/web.env ] || { echo "Thiếu /etc/qlcv/web.env"; exit 1; }
cd "$APP"
sudo -u qlcv git pull --ff-only
sudo -u qlcv npm ci
set -a; . /etc/qlcv/web.env; set +a
sudo -u qlcv --preserve-env=VITE_SUPABASE_URL,VITE_SUPABASE_KEY,VITE_WRITE_PIN,VITE_AI_PROXY_URL npm run build
rsync -a --delete "$APP/dist/" /srv/qlcv/dist/
sudo -u qlcv npm ci --omit=dev >/dev/null
systemctl restart qlcv-api
echo "Đã cập nhật xong: $(date)"
