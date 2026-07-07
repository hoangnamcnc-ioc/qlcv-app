-- Lưu id người tạo mẫu định kỳ (ngoài created_by là tên hiển thị) để nhiệm vụ tự sinh ra
-- có thể copy lại created_by_id, giúp đúng người đã tạo mẫu (thường là TP/PP) duyệt được
-- hoàn thành nhiệm vụ đó thay vì chỉ Admin/BGĐ mới duyệt được.
ALTER TABLE public.recurring_templates ADD COLUMN IF NOT EXISTS created_by_id text;
