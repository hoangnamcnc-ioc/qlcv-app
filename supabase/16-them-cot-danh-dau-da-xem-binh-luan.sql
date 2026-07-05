-- Đánh dấu "đã xem bình luận" theo từng người: lưu JSON map { "<họ tên>": "<thời điểm xem gần nhất>" }
-- trên chính nhiệm vụ, để tính được ai có bình luận mới chưa đọc mà không cần bảng riêng.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS comment_reads text;
