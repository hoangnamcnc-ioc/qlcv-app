#!/usr/bin/env bash
# CÀI ĐẶT MÁY CHỦ QLCV (Ubuntu 22.04 / 24.04, chạy bằng root) — KHÔNG dùng Supabase.
#   git clone https://github.com/hoangnamcnc-ioc/qlcv-app /opt/qlcv/app
#   sudo bash /opt/qlcv/app/deploy/setup-server.sh qlcv.ten-mien-cua-anh.vn
# Dựng: PostgreSQL + PostgREST (Docker), máy chủ API Node (kho file đính kèm + email nhắc việc + trợ lý AI), Caddy (HTTPS tự động),
# tường lửa, fail2ban, lịch chạy (cron), sao lưu hằng đêm.
# CHƯA bao gồm: nạp dữ liệu cũ (deploy/migrate/) và build giao diện (deploy/update.sh).
set -euo pipefail
DOMAIN="${1:?Cú pháp: setup-server.sh <tên-miền>  (A record của tên miền phải trỏ về IP máy chủ này trước)}"
APP=/opt/qlcv/app
STACK=/opt/qlcv/stack
[ "$(id -u)" = 0 ] || { echo "Cần chạy bằng root (sudo)"; exit 1; }
[ -d "$APP/deploy" ] || { echo "Chưa thấy $APP — hãy git clone dự án vào đó trước"; exit 1; }

echo "== 1/7 Gói hệ thống =="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git gnupg ufw fail2ban unattended-upgrades postgresql-client rsync cron debian-keyring debian-archive-keyring apt-transport-https
timedatectl set-timezone Asia/Ho_Chi_Minh || true

echo "== 2/7 Docker =="
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
echo "== 3/7 Node 20 =="
if ! (command -v node >/dev/null && node -v | grep -q '^v2[0-9]'); then curl -fsSL https://deb.nodesource.com/setup_20.x | bash -; apt-get install -y nodejs; fi
echo "== 4/7 Caddy =="
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi

echo "== 5/7 Người dùng, thư mục, khóa & mật khẩu =="
id qlcv >/dev/null 2>&1 || useradd -r -m -d /opt/qlcv -s /bin/bash qlcv
mkdir -p /etc/qlcv /var/log/qlcv /srv/qlcv/dist /var/backups/qlcv /var/lib/qlcv/storage "$STACK" /opt/qlcv/pgdata
chown -R qlcv:qlcv /var/log/qlcv /srv/qlcv /var/backups/qlcv /var/lib/qlcv "$APP"
if [ ! -f /root/keys.env ]; then node "$APP/deploy/gen-keys.mjs" > /root/keys.env; chmod 600 /root/keys.env; echo "Đã tạo /root/keys.env — HÃY SAO LƯU Ở NƠI AN TOÀN"; else echo "Dùng lại /root/keys.env có sẵn"; fi
set -a; . /root/keys.env; set +a

echo "== 6/7 Cơ sở dữ liệu (PostgreSQL + PostgREST) =="
cp "$APP/deploy/stack/docker-compose.yml" "$STACK/docker-compose.yml"
mkdir -p "$STACK/init" && cp "$APP"/deploy/stack/init/* "$STACK/init/" && chmod +x "$STACK"/init/*.sh
printf 'POSTGRES_PASSWORD=%s\nAUTHENTICATOR_PASSWORD=%s\nJWT_SECRET=%s\n' "$POSTGRES_PASSWORD" "$AUTHENTICATOR_PASSWORD" "$JWT_SECRET" > "$STACK/.env"
chmod 600 "$STACK/.env"
(cd "$STACK" && docker compose pull && docker compose up -d)
echo "Chờ CSDL sẵn sàng…"
for i in $(seq 1 40); do docker exec qlcv-db pg_isready -U postgres -d postgres >/dev/null 2>&1 && break; sleep 3; done

echo "== 7/7 Caddy, API, lịch chạy, tường lửa =="
sed "s/__DOMAIN__/$DOMAIN/g" "$APP/deploy/Caddyfile.template" > /etc/caddy/Caddyfile
if [ ! -f /etc/qlcv/api.env ]; then
  sed "s/__DOMAIN__/$DOMAIN/g" "$APP/deploy/api.env.example" > /etc/qlcv/api.env
  sed -i "s|^SUPABASE_SERVICE_KEY=.*|SUPABASE_SERVICE_KEY=$SERVICE_ROLE_KEY|; s|^CRON_SECRET=.*|CRON_SECRET=$CRON_SECRET|; s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" /etc/qlcv/api.env
  chmod 600 /etc/qlcv/api.env
  echo ">>> Mở /etc/qlcv/api.env và điền SMTP_*, MAIL_FROM, GEMINI_API_KEY (giá trị đang dùng trên Vercel)"
fi
cp "$APP/deploy/qlcv-api.service" /etc/systemd/system/qlcv-api.service
(cd "$APP" && sudo -u qlcv npm ci --omit=dev)
systemctl daemon-reload && systemctl enable --now qlcv-api && systemctl restart caddy
if ! crontab -u qlcv -l 2>/dev/null | grep -q daily-digest; then
  sed "s/<dán CRON_SECRET>/$CRON_SECRET/" "$APP/deploy/crontab.example" | crontab -u qlcv -
fi
# Người dùng qlcv cần chạy `docker exec` để sao lưu
usermod -aG docker qlcv || true
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
systemctl enable --now fail2ban

echo
echo "HOÀN TẤT PHẦN MÁY CHỦ. Việc tiếp theo:"
echo "  1) Điền SMTP/Gemini vào /etc/qlcv/api.env rồi: systemctl restart qlcv-api"
echo "  2) Nạp dữ liệu cũ + file đính kèm: xem deploy/README_CHUYEN_HOST.md, mục 2"
echo "  3) Tạo /etc/qlcv/web.env (VITE_SUPABASE_URL=https://$DOMAIN, VITE_SUPABASE_KEY=ANON_KEY, VITE_WRITE_PIN=<mã cũ>) rồi: bash $APP/deploy/update.sh"
echo "  Khóa công khai (ANON_KEY) dùng cho giao diện:"
echo "  $ANON_KEY"
echo "  Kiểm tra cổng: ss -tlnp | grep -E '5432|3000|3001|8000'   (tất cả phải là 127.0.0.1)"
