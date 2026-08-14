-- 41 — TẮT RLS TẠM THỜI để khôi phục quyền GHI cho app (chạy trong Supabase SQL Editor)
-- Bối cảnh: app đăng nhập bằng RPC tự viết (KHÔNG dùng Supabase Auth) → mọi request là vai trò `anon`.
-- Có bảng bị bật RLS mà chưa có policy cho anon ghi → app không tạo/sửa/hoàn thành việc, không lưu được gì
-- (UPDATE thất bại ÂM THẦM: trả 0 dòng, không báo lỗi). Đây là bản khôi phục nhanh; RLS đúng bài để dịp 2/9.
--
-- LƯU Ý: CỐ Ý BỎ QUA bảng `users` — bảng này được bảo vệ riêng ở bước 1a (khóa cột password bằng GRANT/REVOKE,
-- đăng nhập/đổi mật khẩu qua RPC SECURITY DEFINER). KHÔNG đụng vào để tránh lộ lại hash mật khẩu.

-- 1) Tắt RLS trên MỌI bảng schema public, trừ users
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> 'users'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- 2) Đồng bộ lại NGƯỜI GIAO + PHÒNG cho các việc định kỳ ĐANG MỞ theo template gốc
--    (sửa lỗi: bản 13/08 "Báo cáo định kỳ kết nối LGSP" hiển thị Phan Đ. V. Vinh Chuẩn thay vì Trần Trung Thành,
--     do bản đã sinh trước khi đổi người giao trong mẫu). Việc ĐÃ HOÀN THÀNH giữ nguyên (không đụng lịch sử điểm).
UPDATE public.tasks t
SET eid = rt.eid, dept = rt.dept
FROM public.recurring_templates rt
WHERE t.template_id = rt.id
  AND t.completed = false
  AND (t.eid IS DISTINCT FROM rt.eid OR t.dept IS DISTINCT FROM rt.dept);

-- 3) Kiểm tra nhanh sau khi chạy (tuỳ chọn): danh sách bảng còn bật RLS
-- SELECT relname FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relrowsecurity = true;
