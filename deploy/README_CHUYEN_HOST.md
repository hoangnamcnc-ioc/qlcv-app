# Cài QLCV trên máy chủ riêng (VPS) — cài mới hoàn toàn, KHÔNG dùng Supabase

> Bộ công cụ này dựng QLCV **mới hoàn toàn** (không cần dữ liệu cũ) trên **một máy chủ Linux của cơ quan**, chỉ dùng phần mềm mã nguồn mở:
>
> | Thành phần | Chạy bằng |
> |---|---|
> | Cơ sở dữ liệu | **PostgreSQL 16** (Docker) |
> | API dữ liệu `/rest/v1` | **PostgREST** (Docker) |
> | Kho file đính kèm `/storage/v1` | **Máy chủ Node tự viết** (`deploy/api-server/storage.js`), lưu file trên đĩa |
> | Email nhắc việc, nhắc lịch trực, trợ lý AI | Máy chủ Node (`deploy/api-server/server.js`) + cron |
> | HTTPS, giao diện web | **Caddy** |
>
> Giao diện vẫn dùng thư viện máy khách `@supabase/supabase-js` (mã nguồn mở, chỉ nói chuyện HTTP với PostgREST) — **không có dịch vụ nào của Supabase tham gia**.
>
> **Đã kiểm chứng ở máy phát triển:** kho file (15 tình huống tự động, gồm tải lên bằng chính `supabase-js`); cú pháp 232 câu lệnh của `deploy/db/schema.sql` bằng bộ phân tích Postgres thật; mọi cột của 13 bảng đang chạy trên hệ thống cũ đều có trong schema mới.
> **Chưa chạy thử trên máy chủ thật:** `setup-server.sh`, Docker, Caddy. Hãy thử trên máy chủ thử trước.

## 0. Cần chuẩn bị

| Hạng mục | Yêu cầu |
|---|---|
| Hệ điều hành | **Ubuntu 22.04 hoặc 24.04** (Linux). |
| Cấu hình | 2 CPU, **2–4 GB RAM**, ổ đĩa 40 GB trở lên. |
| Tên miền | Tên miền/tên miền phụ, ví dụ `qlcv.ten-co-quan.vn`, **A record trỏ về IP máy chủ** (cần để có HTTPS). |
| Cổng mạng | Mở **22**, **80**, **443**. Các cổng 5432/3000/3001/8000 chỉ nghe nội bộ. |
| Quyền | `root`/`sudo` qua SSH. |
| Email nhắc việc (tùy chọn) | Gmail + "mật khẩu ứng dụng", khóa Gemini cho trợ lý AI. |

## 1. Cài đặt (≈ 15–20 phút, 2 lệnh)

```bash
# trên máy chủ, bằng root
git clone https://github.com/hoangnamcnc-ioc/qlcv-app /opt/qlcv/app
sudo bash /opt/qlcv/app/deploy/setup-server.sh qlcv.ten-co-quan.vn
```

Script tự làm: cài Docker, Node 20, Caddy; sinh khóa và mật khẩu riêng vào `/root/keys.env` (**sao lưu file này ở nơi an toàn**); dựng PostgreSQL + PostgREST; **tạo cấu trúc CSDL** (`deploy/db/schema.sql`: 21 bảng, hàm đăng nhập/quản trị, quyền từng bảng/cột, danh mục sản phẩm chuẩn KPI, 3 phòng mặc định); **tạo tài khoản quản trị** (mật khẩu ngẫu nhiên in ra và lưu ở `/root/admin-account.txt`); build giao diện; cài dịch vụ `qlcv-api`; đặt lịch gửi email và sao lưu; bật tường lửa và fail2ban.

Sau khi chạy xong:
1. Mở `https://<tên-miền>`, đăng nhập bằng tài khoản quản trị, **đổi mật khẩu ngay**, rồi xóa `/root/admin-account.txt`.
2. Trong ứng dụng: **Quản lý nhân sự** tạo phòng/nhân viên, **🔐 Quản lý tài khoản** tạo tài khoản cho Giám đốc và từng người (tài khoản mới dùng mật khẩu mặc định yếu sẽ bị buộc đổi khi đăng nhập).
3. Bật email nhắc việc: mở `/etc/qlcv/api.env`, điền `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (và `GEMINI_API_KEY` cho trợ lý AI), rồi `systemctl restart qlcv-api`. Kiểm tra thử:
   `curl -H "Authorization: Bearer $CRON_SECRET" "http://127.0.0.1:3001/api/daily-digest?dry=1"` (`CRON_SECRET` trong `/root/keys.env`).

**Kiểm tra bảo mật ngay sau khi cài** (mật khẩu người dùng không được lộ với khóa công khai):
```bash
curl -s "https://<tên-miền>/rest/v1/users?select=password" -H "apikey: <ANON_KEY>"      # phải báo lỗi quyền 42501
curl -s "https://<tên-miền>/rest/v1/employees?select=hr"   -H "apikey: <ANON_KEY>"      # phải báo lỗi quyền 42501
ss -tlnp | grep -E '5432|3000|3001|8000'                                                 # tất cả phải là 127.0.0.1
```

## 2. Vận hành hằng ngày

| Việc | Lệnh / vị trí |
|---|---|
| Trạng thái | `cd /opt/qlcv/stack && docker compose ps`; `systemctl status qlcv-api caddy` |
| Nhật ký | `docker compose logs -f --tail=100 rest`; `journalctl -u qlcv-api -f`; `/var/log/qlcv/` |
| Vào CSDL | `docker exec -it qlcv-db psql -U postgres -d postgres` |
| Cập nhật phần mềm | `sudo bash /opt/qlcv/app/deploy/update.sh` (kéo mã mới, build, thay bản chạy) |
| Chạy SQL bổ sung sau này (vd. `supabase/52-….sql`) | `docker exec -i qlcv-db psql -U postgres -d postgres < supabase/52-….sql`, rồi `notify pgrst, 'reload schema';` (thư mục `supabase/` chỉ là tên cũ, các file là SQL thuần). Sau khi thêm file SQL mới vào repo, chạy `python3 deploy/db/build-schema.py` để `schema.sql` luôn cập nhật. |
| Sao lưu | Tự chạy 01:30 hằng đêm (`deploy/backup.sh`) vào `/var/backups/qlcv` (CSDL nén + file đính kèm, giữ 14 bản). **Hãy chép định kỳ sang nơi khác (ổ ngoài/máy khác).** |
| Sao lưu/khôi phục trong ứng dụng | **Quản lý nhân sự → 💾 Sao lưu & Khôi phục** (Admin/Giám đốc): tải toàn bộ dữ liệu (JSON, có thể mã hóa), xuất CSV từng bảng, nạp lại bằng chế độ Trộn hoặc Thay thế. Chưa gồm file đính kèm (đã có `backup.sh`). |
| Khôi phục từ sao lưu | `gunzip -c qlcv-….sql.gz \| docker exec -i qlcv-db psql -U postgres -d postgres` (trên CSDL trống/đã làm sạch schema public) |
| Script `cleanup_storage.py`, `sync_vanban.py` | Đặt `SUPABASE_URL` = `https://<tên-miền>`, `SUPABASE_SERVICE_KEY` = `SERVICE_ROLE_KEY` trong `/root/keys.env` |

## 3. Bảo mật

- Mọi khóa/mật khẩu là **mới và riêng của anh** (`/root/keys.env`); khóa cũ đã lộ trong repo công khai không còn liên quan. **Không đưa `keys.env` lên Git**.
- Docker bỏ qua tường lửa `ufw`: `docker-compose.yml` ràng cổng vào `127.0.0.1`; Caddy là cửa duy nhất ra Internet.
- Đăng nhập SSH bằng khóa, tắt đăng nhập root bằng mật khẩu; `unattended-upgrades` đã cài để tự cập nhật bảo mật.
- **Sao lưu ra ngoài máy chủ.**
- Cơ chế hiện tại (giữ nguyên từ bản cũ): ứng dụng dùng khóa công khai `anon` và các hàm đăng nhập/quản trị kiểm tra mật khẩu trong CSDL; cột mật khẩu và hồ sơ nhân sự bị khóa bằng quyền cột. Vì nay anh quản trị CSDL, đây là dịp tốt để làm tiếp lộ trình khóa quyền theo từng người (RLS).

## 4. Phụ lục — nếu sau này cần chuyển dữ liệu từ hệ thống Supabase cũ (tùy chọn)

Chỉ cần khi anh đổi ý và muốn giữ dữ liệu cũ. Thư mục `deploy/migrate/` có 5 bước: `01_export_cloud.sh` (xuất từ hệ thống cũ), `02_restore_local.sh` (nạp vào máy mới), `03_migrate_storage.mjs` (chép file đính kèm), `04_rewrite_urls.sql` (đổi địa chỉ file), `05_verify.sh` (đối chiếu số dòng). Bước 02 sẽ xóa schema `public` hiện có rồi nạp lại, nên chỉ dùng trên máy chủ chưa có dữ liệu thật. Mật khẩu người dùng cũ (đã băm) đi theo dữ liệu nên đăng nhập như cũ.

## 5. Giới hạn đã biết

- Chưa chạy thử trên máy chủ thật: `setup-server.sh`, Docker, Caddy.
- `schema.sql` ghép từ bảng nền và các file SQL đã chạy trên hệ thống cũ; kiểu dữ liệu từng cột chưa được so với hệ thống cũ (tên cột thì đã khớp 100%). Nếu bước dựng CSDL báo lỗi, gửi nguyên văn dòng lỗi.
- Chưa có giao diện quản trị CSDL (như Supabase Studio). Dùng `psql`, hoặc cài Adminer/pgAdmin nghe `127.0.0.1` và truy cập qua đường hầm SSH.
- Hàm `check_write_pin` (mã ghi `x-write-pin`) là cơ chế của hệ thống cũ và không có trong cài mới; để trống `VITE_WRITE_PIN`.
