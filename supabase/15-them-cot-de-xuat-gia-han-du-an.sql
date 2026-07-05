-- Đề xuất & duyệt gia hạn "Hạn hoàn thành" của dự án (Nhiệm vụ ngân sách):
-- Phụ trách chính đề xuất, chỉ Ban Giám đốc duyệt đúng ngày hoặc ngắn hơn (nêu lý do), hoặc từ chối.
-- Gia hạn từng bước dùng chung cột "steps" (JSON) có sẵn, không cần cột riêng.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ext_proposed text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ext_reason text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ext_requested_by text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ext_requested_at text;
