-- Nhật ký thay đổi số liệu ngân sách của dự án: mỗi lần sửa "Tổng mức đầu tư" hoặc "Đã chi"
-- đều ghi lại ai sửa, lúc nào, từ bao nhiêu thành bao nhiêu — lưu JSON array trên chính dự án.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget_log text;
