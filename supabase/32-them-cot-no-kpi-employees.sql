-- Nhân sự khoán lương / làm nhiệm vụ riêng (bảo vệ…): KHÔNG giao việc trên hệ thống và KHÔNG tính KPI.
-- Cờ này loại họ khỏi: danh sách giao việc/phối hợp/chuyển tiếp, bảng hiệu suất & xếp hạng, đầu người phòng
-- (mẫu số điểm điều hành & tải bình quân), cảnh báo quá tải, so sánh khối lượng.
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS no_kpi boolean DEFAULT false;

-- Đánh dấu 2 bảo vệ phòng HCTH (khoán lương). Sau này thêm/bớt bằng ô tích trong form Nhân viên.
UPDATE public.employees SET no_kpi = true
WHERE dept = 'HCTH' AND name IN ('Nguyễn Sỹ Hợp', 'Nguyễn Tiến Quang');
