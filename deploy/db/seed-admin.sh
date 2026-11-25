#!/usr/bin/env bash
# TẠO TÀI KHOẢN QUẢN TRỊ ĐẦU TIÊN (chạy TRÊN MÁY CHỦ sau apply-schema.sh). In mật khẩu ngẫu nhiên MỘT LẦN — hãy ghi lại và đổi ngay sau khi đăng nhập.
#   bash /opt/qlcv/app/deploy/db/seed-admin.sh [tên-đăng-nhập]      (mặc định: admin)
set -euo pipefail
DB=qlcv-db
USERNAME="${1:-admin}"
[[ "$USERNAME" =~ ^[A-Za-z0-9._-]{3,32}$ ]] || { echo "Tên đăng nhập chỉ gồm chữ/số . _ - (3–32 ký tự)"; exit 1; }
PASS="$(head -c 18 /dev/urandom | base64 | tr -d '/+=' | cut -c1-14)Aa1"
if [ "$(docker exec -i "$DB" psql -U postgres -d postgres -Atc "select count(*) from public.users where username='$USERNAME'")" != "0" ]; then
  echo "Tài khoản '$USERNAME' đã tồn tại — không tạo lại."; exit 1
fi
# Mật khẩu lưu dạng băm 'h$' + sha256 (cùng định dạng hàm login của ứng dụng)
docker exec -i "$DB" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -v u="$USERNAME" -v p="$PASS" <<'SQL'
insert into public.users (id, username, password, full_name, role, employee_id, is_top_director)
values ('u_' || :'u', :'u', 'h$' || encode(sha256(convert_to(:'p', 'UTF8')), 'hex'), 'Quản trị viên', 'admin', null, false);
SQL
echo
echo "=============================================="
echo " Tài khoản quản trị:  $USERNAME"
echo " Mật khẩu (ghi lại):  $PASS"
echo "=============================================="
echo "Đăng nhập, vào Quản lý tài khoản để tạo tài khoản Giám đốc và nhân viên; đổi mật khẩu quản trị ngay."
