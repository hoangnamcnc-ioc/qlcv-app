-- Cho phép đính kèm file (ảnh chụp, log, tài liệu kết quả xử lý) vào từng trường hợp
-- Hỗ trợ người dùng/PAHT và Xử lý lỗi Trung tâm dữ liệu.
ALTER TABLE public.support_cases ADD COLUMN IF NOT EXISTS attachments text;
