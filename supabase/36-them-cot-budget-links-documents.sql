-- Ghi nhận văn bản đã được gán vào bước nào của nhiệm vụ ngân sách nào (có thể nhiều bước/dự án).
-- Mảng JSON: [{ "project_id","project_name","step_id","step_content" }]. Dùng để hiển thị nhãn "Đã gán ngân sách".
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS budget_links text DEFAULT '[]';
