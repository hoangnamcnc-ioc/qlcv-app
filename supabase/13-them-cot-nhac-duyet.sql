-- Cho phép người yêu cầu duyệt "nhắc" người duyệt khi yêu cầu bị treo lâu
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reminder_at text;
