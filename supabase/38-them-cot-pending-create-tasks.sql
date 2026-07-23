-- Việc nhân viên TỰ TẠO phải được Trưởng/Phó phòng duyệt trước khi thành việc chính thức.
-- pending_create = true  -> đang chờ duyệt (chưa tính vào danh sách/báo cáo/chấm điểm)
-- pending_create = false -> đã duyệt (việc chính thức, như cũ)
alter table public.tasks add column if not exists pending_create boolean not null default false;

-- Các việc đã tạo trước đây mặc định = false (đã là việc chính thức) — không cần đụng dữ liệu cũ.
