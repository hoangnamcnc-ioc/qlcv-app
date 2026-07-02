-- Thêm cột phân loại "Hỗ trợ người dùng và xử lý PAHT" / "Xử lý lỗi Trung tâm dữ liệu" cho bảng support_cases
ALTER TABLE public.support_cases ADD COLUMN IF NOT EXISTS category text DEFAULT 'support';
