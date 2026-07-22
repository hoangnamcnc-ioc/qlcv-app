-- Miễn phạt trễ khách quan: việc trễ vì lý do NGOÀI TẦM KIỂM SOÁT của người thực hiện (chờ ý kiến cấp trên,
-- phụ thuộc đơn vị khác…). Trưởng/Phó phòng/BGĐ đánh dấu → không trừ điểm phạt khi chấm hiệu suất:
--   completed_late (HT trễ) được đánh dấu → coi như đúng hạn; overdue được đánh dấu → loại khỏi mẫu số điểm.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS late_excused boolean DEFAULT false;
