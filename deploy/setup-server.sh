#!/usr/bin/env bash
# CÀI ĐẶT MÁY CHỦ QLCV (Ubuntu 22.04 / 24.04, chạy bằng root).
#   git clone https://github.com/hoangnamcnc-ioc/qlcv-app /opt/qlcv/app
#   sudo bash /opt/qlcv/app/deploy/setup-server.sh qlcv.ten-mien-cua-anh.vn
# Việc làm: cài Docker, Node 20, Caddy (HTTPS tự động), tường lửa; dựng Supabase tự chạy; cấu hình API + lịch chạy.
# CHƯA bao gồm: nạp dữ liệu cũ (xem deploy/migrate/) và build giao diện (xem deploy/update.sh).
set -euo pipefail
DOMAIN="${1:?Cú pháp: setup-server.sh <tên-miền>  (A record của tên miền phải trỏ về IP máy chủ này trước)}"
APP=/opt/qlcv/app
SB=/opt/qlcv/supabase
[ "$(id -u)" = 0 ] || { echo "Cần chạy bằng root (sudo)"; exit 1; }
[ -d "$APP/deploy" ] || { echo "Chưa thấy $APP — hãy git clone dự án vào đó trước"; exit 1; }

echo "== 1/8 Gói hệ thống =="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git gnupg ufw fail2ban unattended-upgrades postgresql-client rsync cron debian-keyring debian-archive-keyring apt-transport-https
timedatectl set-timezone Asia/Ho_Chi_Minh || true

echo "== 2/8 Docker =="
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
echo "== 3/8 Node 20 =="
command -v node >/dev/null && node -v | grep -q '^v2[0-9]' || { curl -fsSL https://deb.nodesource.com/setup_20.x | bash -; apt-get install -y nodejs; }
echo "== 4/8 Caddy =="
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi

echo "== 5/8 Người dùng, thư mục =="
id qlcv >/dev/null 2>&1 || useradd -r -m -d /opt/qlcv -s /bin/bash qlcv
mkdir -p /etc/qlcv /var/log/qlcv /srv/qlcv/dist /var/backups/qlcv "$SB"
chown -R qlcv:qlcv /var/log/qlcv /srv/qlcv /var/backups/qlcv
chown -R qlcv:qlcv "$APP"

echo "== 6/8 Khóa & mật khẩu (tạo 1 lần, lưu /root/keys.env — HÃY SAO LƯU Ở NƠI AN TOÀN) =="
if [ ! -f /root/keys.env ]; then node "$APP/deploy/gen-keys.mjs" > /root/keys.env; chmod 600 /root/keys.env; echo "Đã tạo /root/keys.env"; else echo "Dùng lại /root/keys.env có sẵn"; fi
set -a; . /root/keys.env; set +a

echo "== 7/8 Supabase tự chạy (Docker) =="
if [ ! -f "$SB/docker-compose.yml" ]; then
  rm -rf /tmp/supabase-src && git clone --depth 1 https://github.com/supabase/supabase /tmp/supabase-src
  cp -r /tmp/supabase-src/docker/. "$SB/" && rm -rf /tmp/supabase-src
fi
cd "$SB"
[ -f .env ] || cp .env.example .env
setenv(){ if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$2|" .env; else echo "$1=$2" >> .env; fi; }
setenv POSTGRES_PASSWORD "$POSTGRES_PASSWORD"; setenv JWT_SECRET "$JWT_SECRET"; setenv ANON_KEY "$ANON_KEY"; setenv SERVICE_ROLE_KEY "$SERVICE_ROLE_KEY"
setenv DASHBOARD_USERNAME "$DASHBOARD_USERNAME"; setenv DASHBOARD_PASSWORD "$DASHBOARD_PASSWORD"
setenv SECRET_KEY_BASE "$SECRET_KEY_BASE"; setenv VAULT_ENC_KEY "$VAULT_ENC_KEY"; setenv PG_META_CRYPTO_KEY "$PG_META_CRYPTO_KEY"
setenv SITE_URL "https://$DOMAIN"; setenv API_EXTERNAL_URL "https://$DOMAIN"; setenv SUPABASE_PUBLIC_URL "https://$DOMAIN"
setenv ENABLE_EMAIL_SIGNUP false; setenv ENABLE_ANONYMOUS_USERS false; setenv DISABLE_SIGNUP true
setenv PGRST_DB_MAX_ROWS 1000
# QUAN TRỌNG: Docker bỏ qua tường lửa ufw → chỉ cho các cổng nội bộ nghe trên 127.0.0.1 (không lộ Postgres/Kong ra Internet)
cp docker-compose.yml docker-compose.yml.orig
sed -i -E 's#^(\s*-\s*)("?)\$\{(KONG_HTTP_PORT|KONG_HTTPS_PORT|POSTGRES_PORT|POOLER_PROXY_PORT_TRANSACTION)\}:#\1\2127.0.0.1:${\3}:#' docker-compose.yml
grep -nE '127\.0\.0\.1:\$\{' docker-compose.yml || echo "CẢNH BÁO: không thấy dòng cổng nào được ràng 127.0.0.1 — kiểm tra thủ công docker-compose.yml (cổng 5432, 8000 không được mở ra ngoài)"
docker compose pull
docker compose up -d
chown -R qlcv:qlcv "$SB/volumes" 2>/dev/null || true

echo "== 8/8 Caddy, API, lịch chạy, tường lửa =="
sed "s/__DOMAIN__/$DOMAIN/g" "$APP/deploy/Caddyfile.template" > /etc/caddy/Caddyfile
if [ ! -f /etc/qlcv/api.env ]; then
  sed "s/__DOMAIN__/$DOMAIN/g" "$APP/deploy/api.env.example" > /etc/qlcv/api.env
  sed -i "s|^SUPABASE_SERVICE_KEY=.*|SUPABASE_SERVICE_KEY=$SERVICE_ROLE_KEY|; s|^CRON_SECRET=.*|CRON_SECRET=$CRON_SECRET|" /etc/qlcv/api.env
  chmod 600 /etc/qlcv/api.env
  echo ">>> Mở /etc/qlcv/api.env và điền SMTP_*, MAIL_FROM, GEMINI_API_KEY (giá trị đang dùng trên Vercel)"
fi
cp "$APP/deploy/qlcv-api.service" /etc/systemd/system/qlcv-api.service
(cd "$APP" && sudo -u qlcv npm ci --omit=dev)
systemctl daemon-reload && systemctl enable --now qlcv-api && systemctl restart caddy
# lịch chạy cho người dùng qlcv (nếu chưa có)
if ! crontab -u qlcv -l 2>/dev/null | grep -q daily-digest; then
  sed "s/<dán CRON_SECRET>/$CRON_SECRET/" "$APP/deploy/crontab.example" | crontab -u qlcv -
fi
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
systemctl enable --now fail2ban
echo
echo "HOÀN TẤT PHẦN MÁY CHỦ. Việc tiếp theo:"
echo "  1) Điền SMTP/Gemini vào /etc/qlcv/api.env rồi: systemctl restart qlcv-api"
echo "  2) Nạp dữ liệu cũ: xem deploy/migrate/ (README_CHUYEN_HOST.md, mục 3)"
echo "  3) Build giao diện: bash $APP/deploy/update.sh   (cần VITE_SUPABASE_KEY=$ANON_KEY trong /etc/qlcv/web.env)"
echo "  Khóa công khai (ANON_KEY) dùng cho giao diện: $ANON_KEY"
