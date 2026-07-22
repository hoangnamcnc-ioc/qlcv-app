-- Phụ thuộc giữa nhiệm vụ: 1 nhiệm vụ có thể "chờ" 1 nhiệm vụ khác hoàn thành trước mới được hoàn thành.
-- depends_on lưu id của nhiệm vụ phải xong trước. Rỗng = không phụ thuộc.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS depends_on text;
