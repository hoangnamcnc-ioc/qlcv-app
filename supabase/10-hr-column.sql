-- QL Nhân sự: thêm 1 cột JSON "hr" vào bảng employees để chứa toàn bộ hồ sơ nhân sự
-- (thông tin cá nhân, khen thưởng/kỷ luật, nghỉ phép). Chạy MỘT LẦN trong Supabase → SQL Editor.
-- Không xoá/đổi dữ liệu cũ; chỉ thêm cột mới, mặc định rỗng.

alter table public.employees add column if not exists hr jsonb;

-- (Tuỳ chọn) mô tả cấu trúc lưu trong hr — chỉ để tham khảo, không bắt buộc:
-- {
--   "dob":"1985-03-12","gender":"nam","ethnicity":"Kinh","cccd":"","phone":"","email":"","address":"",
--   "join_date":"2010-01-01","party_date":"","rank":"Chuyên viên","education":"Đại học CNTT","politics":"Trung cấp",
--   "rewards":[{"date":"2024-01-05","type":"reward","title":"Chiến sĩ thi đua","note":""}],
--   "leaves":[{"from":"2024-07-01","to":"2024-07-03","days":3,"type":"annual","reason":"Việc gia đình"}]
-- }
