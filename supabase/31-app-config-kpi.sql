-- Cấu hình dùng chung toàn cơ quan (key-value). Bảng này đã có sẵn (đang lưu key='holidays').
-- Câu lệnh idempotent để chắc chắn tồn tại + có khóa chính trên 'key' cho các DB mới/demo.
CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value text
);

-- Chỉ tiêu tỷ lệ hoàn thành (KPI) mặc định 85% nếu chưa có (không ghi đè nếu BGĐ đã đặt).
INSERT INTO public.app_config (key, value)
VALUES ('kpi_ontime', '85')
ON CONFLICT (key) DO NOTHING;
