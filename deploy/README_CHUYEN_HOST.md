# Chuyển QLCV lên máy chủ riêng (VPS) — tự chạy cả giao diện và cơ sở dữ liệu

> Bộ công cụ này chuyển hệ thống từ **Vercel + Supabase đám mây** sang **một máy chủ Linux của cơ quan**, gồm:
> giao diện web, cơ sở dữ liệu Postgres (Supabase tự chạy bằng Docker), kho file đính kèm, email nhắc việc, nhắc lịch trực và trợ lý AI.
> **Các script chưa được chạy thử trên máy chủ thật** — hãy làm lần đầu trên máy chủ thử hoặc theo đúng kế hoạch chuyển có dự phòng ở mục 4.

## 0. Cần chuẩn bị

| Hạng mục | Yêu cầu |
|---|---|
| Hệ điều hành | **Ubuntu 22.04 hoặc 24.04** (Linux). Windows Server không khuyến nghị (Supabase chạy bằng Docker/Linux). |
| Cấu hình tối thiểu | 2 CPU, **4 GB RAM** (khuyến nghị 8 GB), ổ đĩa 40 GB trở lên (file đính kèm hiện ~0,6 GB và tăng dần). |
| Tên miền | Một tên miền/tên miền phụ, ví dụ `qlcv.ten-co-quan.vn`, **A record trỏ về IP máy chủ**. Cần để có HTTPS. |
| Cổng mạng | Mở **22** (SSH), **80** và **443**. Không mở 5432/8000. |
| Quyền | Tài khoản `root`/`sudo` qua SSH. |
| Thông tin cũ | Địa chỉ Supabase cũ, **mật khẩu Database** (Supabase → Project Settings → Database), **`service_role` key cũ** (Supabase → Settings → API), mật khẩu ứng dụng Gmail, khóa Gemini, `VITE_WRITE_PIN` trong file `.env`. |

## 1. Dựng máy chủ (≈ 20–30 phút)

```bash
# trên máy chủ, bằng root
git clone https://github.com/hoangnamcnc-ioc/qlcv-app /opt/qlcv/app
sudo bash /opt/qlcv/app/deploy/setup-server.sh qlcv.ten-co-quan.vn
```

Script sẽ: cài Docker, Node 20, Caddy (HTTPS tự động); sinh khóa/mật khẩu mới vào `/root/keys.env` (**sao lưu file này ở nơi an toàn**);
dựng Supabase bằng Docker (chỉ nghe `127.0.0.1`); cài dịch vụ `qlcv-api`; đặt lịch gửi email; bật tường lửa và fail2ban.

Sau khi chạy xong:
1. Mở `/etc/qlcv/api.env`, điền `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `GEMINI_API_KEY` (giống giá trị đang dùng trên Vercel), rồi `systemctl restart qlcv-api`.
2. Tạo `/etc/qlcv/web.env` từ `deploy/web.env.example`: điền `VITE_SUPABASE_KEY` = `ANON_KEY` trong `/root/keys.env`, và `VITE_WRITE_PIN` **giữ nguyên giá trị cũ** (hàm `check_write_pin` trong CSDL so khớp mã này).
   Kiểm tra mã nằm ở đâu: trên Supabase cũ chạy `select prosrc from pg_proc where proname='check_write_pin';`.

## 2. Nạp dữ liệu cũ

Làm trên máy chủ (cần `postgresql-client`, đã cài ở bước 1).

```bash
export CLOUD_DB_URL='postgresql://postgres:<MẬT_KHẨU_DB>@db.<mã>.supabase.co:5432/postgres'

# (1) Xuất bảng + dữ liệu + hàm RPC + quyền từ Supabase cũ
bash /opt/qlcv/app/deploy/migrate/01_export_cloud.sh qlcv-cloud.sql
# (2) Nạp vào Postgres mới
sudo bash /opt/qlcv/app/deploy/migrate/02_restore_local.sh qlcv-cloud.sql
# (3) Chép file đính kèm (giữ nguyên tên file)
CLOUD_URL=https://<mã>.supabase.co CLOUD_SERVICE_KEY=<service_role cũ> \
NEW_URL=https://qlcv.ten-co-quan.vn NEW_SERVICE_KEY=<SERVICE_ROLE_KEY mới> \
node /opt/qlcv/app/deploy/migrate/03_migrate_storage.mjs
# (4) Đổi địa chỉ file đính kèm trong dữ liệu (cũ → mới)
docker exec -i supabase-db psql -U postgres -d postgres \
  -v old='https://<mã>.supabase.co' -v new='https://qlcv.ten-co-quan.vn' \
  < /opt/qlcv/app/deploy/migrate/04_rewrite_urls.sql
# (5) Đối chiếu số dòng từng bảng
bash /opt/qlcv/app/deploy/migrate/05_verify.sh
```

Lưu ý: mật khẩu người dùng nằm trong bảng `users` dưới dạng **đã băm** và đi theo dữ liệu, nên **mọi người vẫn đăng nhập bằng mật khẩu cũ**.

## 3. Dựng giao diện

```bash
sudo bash /opt/qlcv/app/deploy/update.sh      # kéo mã mới, build, thay bản chạy; dùng lại mỗi lần cập nhật phần mềm
```

Mở `https://qlcv.ten-co-quan.vn`, đăng nhập thử.

## 4. Kế hoạch chuyển có dự phòng (khuyến nghị)

1. **Giữ nguyên hệ thống cũ chạy** (Vercel + Supabase) cho tới khi hệ thống mới được kiểm tra xong. Chuyển thử trước, người dùng chưa biết.
2. Chạy mục 1–3 để có bản thử; đăng nhập, kiểm tra các việc dưới đây rồi mới chọn ngày chuyển chính thức:
   - đăng nhập, xem danh sách việc, tạo/sửa việc;
   - mở file đính kèm cũ và tải lên file mới;
   - 📝 Tiêu chí chung, 📄 Phiếu xếp loại, báo cáo KPI;
   - trợ lý AI; gửi thử email nhắc việc: `curl -H "Authorization: Bearer $CRON_SECRET" "http://127.0.0.1:3001/api/daily-digest?dry=1"` rồi `...?only=<email của anh>&force=1`;
   - ngày hôm sau xem `/var/log/qlcv/digest.log`.
3. **Ngày chuyển chính thức:** thông báo mọi người ngừng nhập liệu (30–60 phút) → chạy lại bước 01, 02, 03, 04, 05 (dữ liệu mới nhất) → chạy `update.sh` → báo mọi người dùng địa chỉ mới.
4. Giữ Supabase/Vercel cũ ở chế độ **chỉ đọc/tạm dừng** thêm 2–4 tuần để quay lại khi cần; sau đó mới xóa.
5. Quay lại hệ thống cũ nếu có sự cố: chỉ cần dùng lại địa chỉ Vercel cũ (dữ liệu nhập sau thời điểm chuyển nằm ở máy chủ mới).

## 5. Vận hành hằng ngày

| Việc | Lệnh / vị trí |
|---|---|
| Xem trạng thái | `cd /opt/qlcv/supabase && docker compose ps`; `systemctl status qlcv-api caddy` |
| Nhật ký | `docker compose logs -f --tail=100 rest`; `journalctl -u qlcv-api -f`; `/var/log/qlcv/` |
| Cập nhật phần mềm | `sudo bash /opt/qlcv/app/deploy/update.sh` |
| Sao lưu | Tự chạy 01:30 hằng đêm (`deploy/backup.sh`) vào `/var/backups/qlcv`. **Hãy chép định kỳ sang nơi khác.** |
| Khôi phục từ sao lưu | `gunzip -c qlcv-….sql.gz > f.sql && sudo bash deploy/migrate/02_restore_local.sh f.sql` |
| Vào trang quản trị Supabase (Studio) | Không mở ra Internet. Dùng đường hầm SSH: `ssh -L 8000:127.0.0.1:8000 user@máy-chủ`, mở `http://localhost:8000` (tài khoản/mật khẩu trong `/root/keys.env`: `DASHBOARD_*`). |
| Cập nhật Supabase | `cd /opt/qlcv/supabase && docker compose pull && docker compose up -d` (sao lưu trước) |

## 6. Bảo mật — việc nên làm cùng lúc

- Máy chủ mới dùng **khóa mới** (`ANON_KEY`, `SERVICE_ROLE_KEY`, `JWT_SECRET`) nên khóa `service_role` cũ từng nằm trong lịch sử repo công khai **không còn giá trị** với hệ thống mới. Sau khi chuyển xong, **xóa/tạm dừng dự án Supabase cũ** để khóa cũ vô hiệu hoàn toàn.
- Đổi mật khẩu `admin` (`admin123@` đã lộ) và buộc các tài khoản còn `abc123` đổi (giao diện đã bắt buộc khi đăng nhập).
- Docker bỏ qua tường lửa `ufw`: script đã ràng các cổng 5432/8000 vào `127.0.0.1`; kiểm tra bằng `ss -tlnp | grep -E '5432|8000'` — phải thấy `127.0.0.1`.
- Bật tự động cập nhật bảo mật (`unattended-upgrades` đã cài), đặt đăng nhập SSH bằng khóa, tắt đăng nhập root bằng mật khẩu.
- Sao lưu ra ngoài máy chủ (ổ ngoài hoặc máy khác).

## 7. Tên miền & email

- HTTPS do Caddy tự cấp/gia hạn (Let's Encrypt); chỉ cần A record đúng và cổng 80/443 mở.
- VPS thường gửi được qua cổng SMTP 465/587 (Gmail). Một số nhà cung cấp chặn cổng 25 — không ảnh hưởng cấu hình này.

## 8. Các điểm chưa kiểm chứng (anh nên thử trước khi chuyển chính thức)

- Cú pháp Docker/Supabase thay đổi theo phiên bản; script lấy bản `docker/` mới nhất từ kho Supabase. Nếu `setup-server.sh` báo không thấy dòng cổng nào ràng `127.0.0.1`, mở `docker-compose.yml` sửa tay các cổng `5432`, `8000`, `8443`, `6543` thành `127.0.0.1:...`.
- Chưa có khả năng chạy thật `pg_dump`/nạp dữ liệu từ đây; hãy kiểm tra kết quả ở `05_verify.sh`.
- `check_write_pin` được tạo trực tiếp trên Supabase cũ (không có trong repo) nên được chép theo dữ liệu bằng `pg_dump`; nếu hàm đọc mã từ bảng/biến khác, giữ nguyên `VITE_WRITE_PIN` là đủ.
