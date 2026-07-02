-- Theo dõi trạng thái "Đã xem / Chưa xem" nhiệm vụ của người được giao (eid).
-- Ghi lại lần đầu tiên người được giao mở nhiệm vụ để xem chi tiết.
-- Chạy 1 lần trong Supabase SQL Editor

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS viewed_at text;
