-- Checklist con trong 1 nhiệm vụ: mảng JSON [{ "text": "...", "done": false }]. Tick/bỏ tick các mục
-- sẽ tự cập nhật % tiến độ của nhiệm vụ (= số mục đã tick / tổng số mục).
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS checklist text DEFAULT '[]';
