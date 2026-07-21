-- Đánh dấu dòng chốt sổ của cấp quản lý (TP/PP) — điểm của họ là ĐIỂM ĐIỀU HÀNH (kết quả phòng),
-- khác bản chất với điểm hiệu suất cá nhân của nhân viên. Dùng để hiển thị chú thích trong phiếu xếp loại.
ALTER TABLE public.monthly_scores ADD COLUMN IF NOT EXISTS is_manager boolean DEFAULT false;
