-- 42 — Thêm cột ghi nhận việc NHÂN VIÊN TỰ TẠO bị lãnh đạo phòng TỪ CHỐI (làm bằng chứng)
-- Trước đây từ chối = xóa mềm vào thùng rác (có thể bị dọn sạch → mất dấu vết). Nay GIỮ LẠI bản ghi,
-- đánh dấu create_rejected + lưu lý do/người/thời điểm từ chối. Lý do từ chối là BẮT BUỘC (kiểm ở app).
-- Chạy trong Supabase → SQL Editor.

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS create_rejected      boolean DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS create_reject_reason text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS create_rejected_by   text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS create_rejected_at   text;

-- (Tuỳ chọn) Đưa các việc tự tạo ĐÃ BỊ TỪ CHỐI trước đây (đang nằm trong thùng rác, deleted=true,
-- lịch sử có "Từ chối việc nhân viên tự tạo") trở lại dạng bằng chứng — bỏ comment nếu muốn khôi phục:
-- UPDATE public.tasks SET create_rejected = true, deleted = false
-- WHERE self_created = true AND deleted = true AND history::text LIKE '%Từ chối việc nhân viên tự tạo%';
