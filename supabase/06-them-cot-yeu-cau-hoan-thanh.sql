-- Thêm luồng "Yêu cầu hoàn thành → Chờ duyệt → Duyệt & đánh giá" cho bảng tasks
-- (Nhân viên không tự đánh dấu hoàn thành nữa; TP/PP/BGĐ duyệt và đánh giá cùng lúc)
-- Chạy 1 lần trong Supabase SQL Editor

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS completion_requested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS requested_by          text,
  ADD COLUMN IF NOT EXISTS requested_at          text;
