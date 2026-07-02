-- Thêm cột phân loại "Chi Hoạt Động" / "Chi Mua Sắm" cho bảng projects (Nhiệm vụ ngân sách)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS expense_type text DEFAULT 'operating';
