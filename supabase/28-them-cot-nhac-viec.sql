-- Nhắc việc (trưởng phòng/người giao đôn đốc người thực hiện): đếm số lần đã nhắc + mốc thời gian + ai nhắc.
-- Tách khỏi reminder_at (vốn dùng cho "nhắc duyệt" của nhân viên) để hai luồng không đè lên nhau.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS nudge_count integer DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS nudged_at text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS nudged_by text;
