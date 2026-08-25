-- 43 — "Nhiệm vụ khác": cho NHÂN VIÊN tự tạo + chờ Trưởng/Phó phòng duyệt (giống Nhiệm vụ chính)
-- Từ chối BẮT BUỘC lý do; việc bị từ chối GIỮ LẠI làm bằng chứng (không xóa). Chạy trong Supabase SQL Editor.

ALTER TABLE public.other_tasks ADD COLUMN IF NOT EXISTS pending_create       boolean DEFAULT false;  -- đang chờ duyệt
ALTER TABLE public.other_tasks ADD COLUMN IF NOT EXISTS self_created         boolean DEFAULT false;  -- do nhân viên tự tạo
ALTER TABLE public.other_tasks ADD COLUMN IF NOT EXISTS created_by_id        text;                    -- id người tạo (để lọc "của tôi")
ALTER TABLE public.other_tasks ADD COLUMN IF NOT EXISTS dept                 text;                    -- phòng của người tự tạo (để định tuyến người duyệt)
ALTER TABLE public.other_tasks ADD COLUMN IF NOT EXISTS create_rejected      boolean DEFAULT false;
ALTER TABLE public.other_tasks ADD COLUMN IF NOT EXISTS create_reject_reason text;
ALTER TABLE public.other_tasks ADD COLUMN IF NOT EXISTS create_rejected_by   text;
ALTER TABLE public.other_tasks ADD COLUMN IF NOT EXISTS create_rejected_at   text;
