-- Thêm nhân viên phối hợp cho từng trường hợp Hỗ trợ ND/PAHT và Xử lý lỗi Trung tâm dữ liệu.
-- Người xử lý chính vẫn là cột "eid"; danh sách phối hợp lưu dạng JSON mảng id nhân viên (giống collab_eids của nhiệm vụ).
ALTER TABLE public.support_cases ADD COLUMN IF NOT EXISTS collab_eids text;
