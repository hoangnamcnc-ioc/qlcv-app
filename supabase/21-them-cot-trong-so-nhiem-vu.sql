-- Trọng số quy đổi "việc" khi tính điểm hiệu suất, dùng cho nhiệm vụ sinh ra từ mẫu định kỳ
-- (Hàng ngày=0.25, Hàng tuần=0.5, 2 tuần=1, Hàng tháng=2, Hàng quý=2.5, 6 tháng=3, Hàng năm=3).
-- NULL = nhiệm vụ thường (không phải định kỳ), coi như 1 việc như trước giờ.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS weight numeric;
