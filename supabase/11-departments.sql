-- Quản lý Phòng/Ban động: bảng departments. Chạy MỘT LẦN trong Supabase → SQL Editor.
-- "code" = mã nội bộ CỐ ĐỊNH (cái đang lưu ở employees.dept, tasks.dept…) — KHÔNG đổi để không hỏng dữ liệu cũ.
-- "name" = tên hiển thị (tự đặt đầy đủ, VD "Phòng HCTH", "Ban Giám đốc").
create table if not exists public.departments (
  code  text primary key,
  name  text not null,
  color text default '#6366f1',
  ord   int  default 0
);

-- Seed 3 phòng hiện có (idempotent — chạy lại không nhân đôi, không đè tên đã sửa).
insert into public.departments (code, name, color, ord) values
  ('HCTH',    'Phòng HCTH',    '#6366f1', 1),
  ('QL-KTDL', 'Phòng QL-KTDL', '#0ea5e9', 2),
  ('HT-NTS',  'Phòng HT-NTS',  '#10b981', 3)
on conflict (code) do nothing;
