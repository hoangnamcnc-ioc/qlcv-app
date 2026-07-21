-- Cho phép "Kết thúc dự án" ở Nhiệm vụ ngân sách: khi locked = true thì khóa toàn bộ tương tác
-- (không sửa bước/trạng thái/duyệt/nghiệm thu/gia hạn/trao đổi) cho tới khi Khôi phục (locked = false).
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS locked boolean DEFAULT false;
