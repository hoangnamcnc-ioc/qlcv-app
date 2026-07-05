-- Đề xuất & duyệt gia hạn deadline: nhân viên đề xuất ngày mới + lý do,
-- người giao việc duyệt đúng ngày đó hoặc rút ngắn hơn (nêu lý do), hoặc từ chối hẳn.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS ext_proposed text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS ext_reason text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS ext_requested_by text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS ext_requested_at text;
