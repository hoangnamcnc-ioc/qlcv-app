-- Kiểm soát ghi nhận Hỗ trợ ND/PAHT: Trưởng/Phó phòng/BGĐ có thể xác nhận từng trường hợp,
-- và xóa chuyển vào thùng rác thay vì xóa vĩnh viễn ngay (tránh mất dấu vết khi rà soát).
ALTER TABLE public.support_cases ADD COLUMN IF NOT EXISTS verified_by text;
ALTER TABLE public.support_cases ADD COLUMN IF NOT EXISTS verified_at text;
ALTER TABLE public.support_cases ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false;
