# Chuyển QLCV lên máy chủ riêng (VPS) — KHÔNG dùng Supabase

> Bộ công cụ này chuyển hệ thống từ **Vercel + Supabase đám mây** sang **một máy chủ Linux của cơ quan**, chạy hoàn toàn bằng phần mềm mã nguồn mở:
>
> | Thành phần | Chạy bằng | Thay cho |
> |---|---|---|
> | Cơ sở dữ liệu | **PostgreSQL 16** (Docker) | Postgres của Supabase |
> | API dữ liệu `/rest/v1` | **PostgREST** (Docker) | PostgREST của Supabase |
> | Kho file đính kèm `/storage/v1` | **Máy chủ Node tự viết** (`deploy/api-server/storage.js`), lưu file trên đĩa | Supabase Storage |
> | Email nhắc việc, nhắc lịch trực, trợ lý AI | Máy chủ Node (`deploy/api-server/server.js`) + cron | Vercel Functions/Cron |
> | HTTPS, giao diện web | **Caddy** | Vercel |
>
> Giao diện vẫn dùng thư viện máy khách `@supabase/supabase-js` (thư viện mã nguồn mở, chỉ nói chuyện HTTP với PostgREST) — **không có dịch vụ nào của Supabase tham gia**.
> Nhờ giữ đúng giao thức, giao diện và các script (`cleanup_storage.py`, `sync_vanban.py`) dùng tiếp, chỉ đổi địa chỉ và khóa.
>
> **Các script chưa được chạy thử trên máy chủ thật.** Riêng kho file đã kiểm thử tự động (15 tình huống, gồm tải lên bằng chính `supabase-js`, trùng tên, quyền, chống `../`, SVG, Range).

## 0. Cần chuẩn bị

| Hạng mục | Yêu cầu |
|---|---|
| Hệ điều hành | **Ubuntu 22.04 hoặc 24.04** (Linux). |
| Cấu hình | 2 CPU, **2–4 GB RAM** là đủ (không còn bộ Supabase nặng), ổ đĩa 40 GB trở lên (file đính kèm ~0,6 GB và tăng dần). |
| Tên miền | Tên miền/tên miền phụ, ví dụ `qlcv.ten-co-quan.vn`, **A record trỏ về IP máy chủ**. |
| Cổng mạng | Mở **22**, **80**, **443**. Các cổng 5432/3000/3001/8000 chỉ nghe nội bộ. |
| Quyền | `root`/`sudo` qua SSH. |
| Thông tin cũ | Mật khẩu Database Supabase (Project Settings → Database), **`service_role` key cũ** (Settings → API), mật khẩu ứng dụng Gmail, khóa Gemini, `VITE_WRITE_PIN` trong file `.env`. |

## 1. Dựng máy chủ (≈ 15 phút)

```bash
# trên máy chủ, bằng root
git clone https://github.com/hoangnamcnc-ioc/qlcv-app /opt/qlcv/app
sudo bash /opt/qlcv/app/deploy/setup-server.sh qlcv.ten-co-quan.vn
```

Script cài Docker, Node 20, Caddy; sinh khóa/mật khẩu mới vào `/root/keys.env` (**sao lưu file này ở nơi an toàn**); dựng PostgreSQL + PostgREST; cài dịch vụ `qlcv-api` (kho file + email + AI); đặt lịch chạy; bật tường lửa, fail2ban.

Sau khi chạy xong:
1. Mở `/etc/qlcv/api.env`, điền `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `GEMINI_API_KEY` (giống đang dùng trên Vercel), rồi `systemctl restart qlcv-api`.
2. Tạo `/etc/qlcv/web.env` từ `deploy/web.env.example`: `VITE_SUPABASE_URL=https://<tên-miền>`, `VITE_SUPABASE_KEY` = `ANON_KEY` trong `/root/keys.env`, và `VITE_WRITE_PIN` **giữ nguyên giá trị cũ** (hàm `check_write_pin` trong CSDL so khớp mã này).

## 2. Chuyển dữ liệu cũ

Làm trên máy chủ.

```bash
export CLOUD_DB_URL='postgresql://postgres:<MẬT_KHẨU_DB>@db.<mã>.supabase.co:5432/postgres'

# (1) Xuất bảng + dữ liệu + hàm RPC + quyền + cấu hình vai trò từ hệ thống cũ
bash /opt/qlcv/app/deploy/migrate/01_export_cloud.sh qlcv-cloud.sql
# (2) Nạp vào PostgreSQL mới (tự áp dụng thêm qlcv-cloud.sql.roles.sql: móc kiểm tra mã ghi x-write-pin)
sudo bash /opt/qlcv/app/deploy/migrate/02_restore_local.sh qlcv-cloud.sql
# (3) Chép file đính kèm (giữ nguyên tên file)
CLOUD_URL=https://<mã>.supabase.co CLOUD_SERVICE_KEY=<service_role cũ> \
NEW_URL=https://qlcv.ten-co-quan.vn NEW_SERVICE_KEY=<SERVICE_ROLE_KEY mới> \
node /opt/qlcv/app/deploy/migrate/03_migrate_storage.mjs
# (4) Đổi địa chỉ file đính kèm trong dữ liệu (cũ → mới)
docker exec -i qlcv-db psql -U postgres -d postgres \
  -v old='https://<mã>.supabase.co' -v new='https://qlcv.ten-co-quan.vn' \
  < /opt/qlcv/app/deploy/migrate/04_rewrite_urls.sql
# (5) Đối chiếu số dòng từng bảng
bash /opt/qlcv/app/deploy/migrate/05_verify.sh
```

Mật khẩu người dùng nằm trong bảng `users` dưới dạng **đã băm** và đi theo dữ liệu, nên **mọi người vẫn đăng nhập bằng mật khẩu cũ**.

**Quyền truy cập được giữ nguyên:** quyền theo từng bảng/cột (ví dụ cột mật khẩu bị khóa với khóa công khai) lấy đúng theo bản xuất; script cố ý **không** đặt quyền mặc định cho bảng mới. Sau khi nạp, kiểm tra:
`curl -s "https://<tên-miền>/rest/v1/users?select=password" -H "apikey: <ANON_KEY>"` — phải báo **lỗi quyền (42501)**, không được trả mật khẩu.

## 3. Dựng giao diện

```bash
sudo bash /opt/qlcv/app/deploy/update.sh      # kéo mã mới, build, thay bản chạy; dùng lại mỗi lần cập nhật phần mềm
```

Mở `https://<tên-miền>`, đăng nhập thử.

## 4. Kế hoạch chuyển có dự phòng (khuyến nghị)

1. **Giữ nguyên hệ thống cũ chạy** cho tới khi hệ thống mới kiểm tra xong; chuyển thử trước, người dùng chưa biết.
2. Chạy mục 1–3 để có bản thử; kiểm tra: đăng nhập, danh sách việc, tạo/sửa việc; mở file đính kèm cũ và tải lên file mới; 📝 Tiêu chí chung, 📄 Phiếu xếp loại, báo cáo KPI; trợ lý AI; email thử `curl -H "Authorization: Bearer $CRON_SECRET" "http://127.0.0.1:3001/api/daily-digest?dry=1"`, rồi `…?only=<email của anh>&force=1`; sáng hôm sau xem `/var/log/qlcv/digest.log`.
3. **Ngày chuyển chính thức:** thông báo mọi người ngừng nhập liệu (30–60 phút) → chạy lại bước 01–05 (lấy dữ liệu mới nhất) → `update.sh` → báo mọi người dùng địa chỉ mới.
4. Giữ hệ thống cũ ở chế độ **chỉ đọc/tạm dừng** thêm 2–4 tuần để quay lại khi cần; sau đó mới xóa.

## 5. Vận hành hằng ngày

| Việc | Lệnh / vị trí |
|---|---|
| Trạng thái | `cd /opt/qlcv/stack && docker compose ps`; `systemctl status qlcv-api caddy` |
| Nhật ký | `docker compose logs -f --tail=100 rest`; `journalctl -u qlcv-api -f`; `/var/log/qlcv/` |
| Vào CSDL | `docker exec -it qlcv-db psql -U postgres -d postgres` |
| Chạy file SQL mới (vd. `supabase/52-….sql`) | `docker exec -i qlcv-db psql -U postgres -d postgres < supabase/52-….sql` rồi `notify pgrst, 'reload schema';` (các file SQL trong thư mục `supabase/` vẫn dùng được; chỉ là tên thư mục cũ) |
| Cập nhật phần mềm | `sudo bash /opt/qlcv/app/deploy/update.sh` |
| Sao lưu | Tự chạy 01:30 hằng đêm (`deploy/backup.sh`) vào `/var/backups/qlcv`. **Hãy chép định kỳ sang nơi khác.** |
| Khôi phục từ sao lưu | `gunzip -c qlcv-….sql.gz > f.sql && sudo bash deploy/migrate/02_restore_local.sh f.sql` (file chưa có `.roles.sql` thì áp dụng tay móc `pgrst.db_pre_request`) |
| Script `cleanup_storage.py`, `sync_vanban.py` | Đổi `SUPABASE_URL` thành `https://<tên-miền>` và `SUPABASE_SERVICE_KEY` thành `SERVICE_ROLE_KEY` mới |
| Kiểm tra cổng nội bộ | `ss -tlnp \| grep -E '5432\|3000\|3001\|8000'` — tất cả phải là `127.0.0.1` |

## 6. Bảo mật — làm cùng lúc

- Hệ thống mới dùng **khóa mới** (`ANON_KEY`, `SERVICE_ROLE_KEY`, `JWT_SECRET`), nên khóa `service_role` cũ từng lộ trong repo công khai **hết giá trị**. Sau khi chuyển xong, **xóa/tạm dừng dự án Supabase cũ**.
- Đổi mật khẩu `admin` (`admin123@` đã lộ); các tài khoản còn `abc123` sẽ bị buộc đổi khi đăng nhập.
- Docker bỏ qua tường lửa `ufw`: `docker-compose.yml` đã ràng cổng vào `127.0.0.1`.
- Đăng nhập SSH bằng khóa, tắt đăng nhập root bằng mật khẩu; `unattended-upgrades` đã cài để tự cập nhật bảo mật.
- **Sao lưu ra ngoài máy chủ** (ổ ngoài hoặc máy khác).
- Đây cũng là dịp tốt để làm tiếp lộ trình khóa quyền theo từng người (RLS): vì nay anh quản trị CSDL, có thể bật RLS và đăng nhập riêng theo từng tài khoản.

## 7. Giới hạn đã biết

- **Chưa kiểm chứng trên máy chủ thật:** `setup-server.sh`, các script `migrate/`, `docker-compose.yml`, cấu hình Caddy. Hãy thử trên máy chủ thử trước. Kho file (`storage.js`) đã có kiểm thử tự động: `node deploy/api-server/storage.e2e.mjs`.
- Dữ liệu xuất từ Supabase có thể tham chiếu `extensions.*` hoặc `auth.uid()` (chính sách RLS cũ): script đã tạo sẵn schema/hàm tương thích. Nếu bước 02 báo lỗi khác, gửi nguyên văn dòng `ERROR` để xử lý.
- Móc kiểm tra mã ghi (`check_write_pin`) được sao chép theo cấu hình vai trò của hệ thống cũ (`01_export_cloud.sh`); nếu hệ thống cũ không dùng cách này thì file `.roles.sql` sẽ trống — khi đó mã ghi vẫn hoạt động theo cách cũ qua dữ liệu đã nạp.
- Chưa có Studio (giao diện quản trị CSDL). Dùng `psql`, hoặc cài thêm Adminer/pgAdmin nghe `127.0.0.1` và truy cập qua đường hầm SSH.
