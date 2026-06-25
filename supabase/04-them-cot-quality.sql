-- Thêm các cột đánh giá chất lượng vào bảng projects
-- Chạy 1 lần trong Supabase SQL Editor

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS quality_rating      smallint,   -- 1-5 sao (đánh giá tổng thể)
  ADD COLUMN IF NOT EXISTS quality_note        text,       -- ghi chú nghiệm thu
  ADD COLUMN IF NOT EXISTS quality_on_time     boolean,    -- đúng tiến độ?
  ADD COLUMN IF NOT EXISTS quality_on_budget   boolean,    -- trong ngân sách?
  ADD COLUMN IF NOT EXISTS quality_rated_by    text,       -- người đánh giá
  ADD COLUMN IF NOT EXISTS quality_rated_at    date;       -- ngày đánh giá
