-- Thêm cột nội dung kết quả giải quyết cho bảng support_cases (Hỗ trợ người dùng và xử lý PAHT)
ALTER TABLE public.support_cases ADD COLUMN IF NOT EXISTS result text;
