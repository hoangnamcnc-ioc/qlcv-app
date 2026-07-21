-- Cho phép "Kết thúc nhiệm vụ" ở Nhiệm vụ khác: khi locked = true thì khóa toàn bộ tương tác
-- (không sửa bước/trạng thái/đính kèm) cho tới khi Khôi phục (locked = false).
ALTER TABLE public.other_tasks ADD COLUMN IF NOT EXISTS locked boolean DEFAULT false;
