# TÀI LIỆU VẬN HÀNH — PHẦN MỀM QUẢN LÝ GIAO VIỆC (QLCV)

Trung tâm Giám sát, Điều hành Đô thị thông minh tỉnh Đắk Lắk (DAK LAK IOC)

Tài liệu này dành cho người quản trị/tiếp nhận bàn giao hệ thống. Mục tiêu: một người mới
có hiểu biết kỹ thuật cơ bản đọc xong có thể vận hành, sao lưu, khôi phục và xử lý sự cố thường gặp.

---

## 1. Kiến trúc tổng thể

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| Giao diện (frontend) | React 19 + Vite, thư viện biểu đồ Recharts | Toàn bộ logic chạy trên trình duyệt, không có server riêng |
| Cơ sở dữ liệu + API | Supabase (PostgreSQL + PostgREST + Storage) | Frontend gọi thẳng Supabase bằng anon key |
| Lưu file đính kèm | Supabase Storage, bucket `attachments` | |
| Triển khai (hosting) | Vercel — tự động build & deploy mỗi khi push lên nhánh `main` | |
| Mã nguồn | GitHub: `hoangnamcnc-ioc/qlcv-app` | |

**Điểm cần hiểu:** đây là ứng dụng "không backend" — mọi nghiệp vụ (tính điểm, phân quyền hiển thị,
tạo nhiệm vụ định kỳ, chốt sổ điểm tháng) chạy phía trình duyệt. Các việc "tự động" (tạo nhiệm vụ
định kỳ, tự chốt sổ điểm tháng trước) được kích hoạt khi người có quyền phù hợp **đăng nhập** —
không có tiến trình chạy nền trên server.

## 2. Biến môi trường (file `.env`, không đưa lên Git)

| Biến | Ý nghĩa |
|---|---|
| `VITE_SUPABASE_URL` | Địa chỉ project Supabase, dạng `https://<project>.supabase.co` |
| `VITE_SUPABASE_KEY` | Anon key của Supabase |
| `VITE_WRITE_PIN` | Mã PIN gửi kèm header `x-write-pin` cho các thao tác ghi |

Trên Vercel, khai báo 3 biến này trong Project Settings → Environment Variables.

## 3. Tài khoản & phân quyền

Vai trò lưu trong bảng `users.role`:

| Vai trò | Quyền chính |
|---|---|
| `admin` | Toàn quyền: tài khoản, bảo mật, sao lưu, mọi phòng ban |
| `director` (Ban Giám đốc) | Xem/duyệt toàn đơn vị, nghiệm thu dự án, duyệt gia hạn dự án, chốt sổ điểm |
| `manager_hcth` | Như Trưởng phòng + xem toàn đơn vị + chốt sổ điểm |
| `manager` / `deputy_manager` | Giao việc, duyệt trong phòng mình |
| `staff` | Xem việc được giao, cập nhật tiến độ, yêu cầu duyệt, đề xuất gia hạn |

- Đăng nhập qua hàm RPC `login()` phía server — mật khẩu đã băm SHA-256, cột password đã chặn đọc từ anon (Bước 1a).
- Quên mật khẩu: admin bấm nút 🔑 cạnh tài khoản trong "🔐 Tài khoản" để đặt lại về `abc123`.
- Phiên đăng nhập tự thoát sau 30 phút không thao tác.

## 4. Cấu trúc dữ liệu (các bảng chính)

| Bảng | Nội dung |
|---|---|
| `employees` | Danh sách nhân viên (id, tên, phòng, chức vụ) |
| `users` | Tài khoản đăng nhập, liên kết employee_id |
| `tasks` | Nhiệm vụ chính (kèm lịch sử, đánh giá, gia hạn, bình luận đã xem…) |
| `recurring_templates` | Mẫu nhiệm vụ định kỳ |
| `comments` | Bình luận trên nhiệm vụ |
| `projects` | Nhiệm vụ ngân sách (các bước lưu JSON trong cột `steps`, nhật ký ngân sách trong `budget_log`) |
| `other_tasks` | Nhiệm vụ khác (tổ công tác) |
| `support_cases` | Hỗ trợ người dùng/PAHT và vận hành DC |
| `documents`, `duty_schedule` | Văn bản, lịch trực |
| `approval_delegations` | Ủy quyền duyệt khi Trưởng phòng vắng mặt |
| `monthly_scores` | Sổ điểm hiệu suất đã chốt theo tháng (snapshot cố định) |
| `feedback`, `login_history`, `app_config` | Góp ý, lịch sử đăng nhập, cấu hình |

## 5. Danh sách migration SQL (thư mục `supabase/`, chạy theo thứ tự trong Supabase → SQL Editor)

01 kiểm tra bảo mật (chỉ đọc) · 02 khóa bảng users + hàm login/đổi mật khẩu · 03 sửa login RPC ·
04 cột quality · 05 bảng other_tasks · 06 cột yêu cầu hoàn thành · 07 cột đã xem · 08 cột loại chi ·
09 bảng support_cases · 10 cột kết quả hỗ trợ · 11 cột phân loại hỗ trợ · 12 xác nhận + xóa mềm ·
13 cột nhắc duyệt · 14 đề xuất gia hạn nhiệm vụ · 15 đề xuất gia hạn dự án · 16 đánh dấu đã xem bình luận ·
17 bảng ủy quyền duyệt · 18 nhật ký ngân sách · 19 bảng chốt sổ điểm.

Khi cài lại từ đầu trên project Supabase mới: chạy lần lượt 02→19 (bỏ 01 và 03 nếu 02 đã là bản mới nhất),
tạo bucket Storage tên `attachments` (public).

## 6. Sao lưu & khôi phục

### 6.1. Sao lưu thủ công trong ứng dụng
Đăng nhập tài khoản **admin** → menu trái → **💾 Sao lưu dữ liệu** → tải về 1 file
`qlcv-backup-YYYY-MM-DD.json` chứa toàn bộ các bảng. Cất file vào nơi lưu trữ an toàn
(ổ cứng riêng/USB/drive nội bộ). Khuyến nghị: **ít nhất 1 lần/tuần** và trước mọi lần chạy migration.

### 6.2. Sao lưu tự động hàng tuần (GitHub Actions)
Workflow `.github/workflows/backup.yml` chạy 05:00 sáng thứ Bảy (giờ VN), lưu bản sao thành
**artifact giữ 90 ngày**. Kích hoạt lần đầu:
1. Vào repo GitHub → Settings → Secrets and variables → Actions.
2. Thêm 2 secret: `SUPABASE_URL` và `SUPABASE_ANON_KEY` (giá trị giống file `.env`).
3. Tab Actions → chọn workflow "Sao luu du lieu hang tuan" → Run workflow để thử ngay.
4. Tải bản sao lưu: mở lần chạy → mục **Artifacts**.

### 6.3. Khôi phục
File sao lưu là JSON theo từng bảng. Khôi phục 1 bảng: Supabase → Table Editor → chọn bảng →
Import data (hoặc dùng SQL `insert` từ nội dung JSON). **Lưu ý:** khôi phục đè cần xóa dữ liệu hỏng
trước, và nên thử trên project Supabase nháp trước khi làm trên dữ liệu thật.
Ngoài ra Supabase (gói trả phí) có Point-in-time Recovery — nên bật nếu nâng cấp gói.

## 7. Triển khai & cập nhật phần mềm

- Mọi thay đổi code: commit → push lên nhánh `main` → Vercel tự build & deploy (~1 phút).
- Nếu bản cập nhật kèm file migration mới trong `supabase/`: **chạy SQL trên Supabase TRƯỚC**, rồi mới push code.
- Build thử tại chỗ: `npm install` → `npm run build` (lỗi build sẽ hiện ngay).
- Chạy thử tại chỗ: `npm run dev` → mở `http://localhost:5173`.

## 8. Sự cố thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| "Lỗi kết nối database" khi đăng nhập | Sai/thiếu biến môi trường, hoặc Supabase tạm dừng (gói free tự pause sau 7 ngày không dùng) | Kiểm tra `.env`/Vercel env; vào dashboard Supabase bấm Restore project |
| Ghi dữ liệu báo lỗi "row-level security" | Thiếu `VITE_WRITE_PIN` hoặc pin sai | Kiểm tra biến môi trường trên Vercel |
| Cột không tồn tại (`column ... does not exist`) | Code mới nhưng chưa chạy migration | Chạy file SQL còn thiếu trong `supabase/` theo thứ tự |
| Nhiệm vụ định kỳ không tự tạo / sổ điểm không tự chốt | Chưa có ai thuộc vai trò đủ quyền đăng nhập từ đầu tháng | Nhờ 1 tài khoản BGĐ/Admin đăng nhập; hoặc chốt thủ công ở Báo cáo → 📑 Xếp loại |
| Upload file lỗi | Bucket `attachments` chưa tạo/đổi tên, hoặc hết dung lượng Storage | Kiểm tra Supabase → Storage |
| Quên mật khẩu admin | — | Vào Supabase → SQL Editor: `update users set password = 'abc123' where username = '<tên>';` (lần đăng nhập sau hệ thống tự băm lại) |

## 9. Việc còn nợ (đã thống nhất, chưa làm)

- **Bước 1b bảo mật**: siết chính sách RLS theo vai trò, chuyển thao tác ghi nhạy cảm sang hàm phía
  server — hiện các bảng vẫn dùng chính sách mở + mã PIN tĩnh phía client. Đây là hạng mục ưu tiên
  cao nhất trước khi mở rộng số người dùng.
- Thông báo ngoài ứng dụng (email/Zalo OA) — cần Supabase Edge Functions.
- Quyền duyệt gia hạn BƯỚC dự án đang dùng chung quyền duyệt bước hoàn thành (BGĐ hoặc
  Trưởng/Phó phòng cùng đơn vị) — cần BGĐ xác nhận có thu hẹp hay không.

---
*Cập nhật lần cuối: 05/07/2026. Khi thay đổi kiến trúc/migration mới, cập nhật tài liệu này cùng commit.*
