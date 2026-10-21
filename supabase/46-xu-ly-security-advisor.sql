-- ============================================================
--  46 — Xử lý các cảnh báo THẬT từ Supabase Security Advisor (đã thử nghiệm xác nhận, 21/10/2026)
--  Chạy CẢ FILE trong Supabase > SQL Editor. An toàn cho app (app chỉ dùng upload + link công khai
--  của kho 'attachments' và các RPC login/change_password/admin_*/get_employees_hr/set_employee_hr).
-- ============================================================

-- (1) Đóng việc LIỆT KÊ file trong kho 'attachments'.
--     Hiện anon gọi được POST /storage/v1/object/list/attachments và thấy TOÀN BỘ tên + thông tin file.
--     Bucket là public nên file vẫn mở được qua đường link công khai khi đã biết link — KHÔNG cần policy SELECT.
--     Chỉ bỏ policy SELECT; policy INSERT (cho phép app tải file lên) được GIỮ NGUYÊN.
do $$
declare r record;
begin
  for r in
    select policyname, cmd, qual
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and cmd = 'SELECT'
      and (qual ilike '%attachments%' or qual is null or qual = 'true')
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
    raise notice 'Da bo policy SELECT: % (qual=%)', r.policyname, r.qual;
  end loop;
  -- Nếu còn policy kiểu ALL (gồm cả SELECT) thì KHÔNG tự xóa (sẽ mất quyền upload) — chỉ báo để xử lý tay
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and cmd = 'ALL'
      and (qual ilike '%attachments%' or qual is null or qual = 'true')
  loop
    raise notice 'CHU Y: policy ALL "%" van cho phep liet ke — can tach thanh INSERT rieng roi xoa phan SELECT', r.policyname;
  end loop;
end $$;

-- (2) _verify_admin là hàm NỘI BỘ (chỉ các admin_* gọi) nhưng anon đang gọi được → thành "máy dò mật khẩu admin"
--     không giới hạn số lần. Thu hồi quyền gọi từ API (các admin_* là SECURITY DEFINER nên vẫn gọi được bên trong).
revoke all on function public._verify_admin(text, text) from public, anon, authenticated;

-- (3) Cảnh báo "Function Search Path Mutable" của check_write_pin (hàm KHÔNG thuộc repo này): cố định search_path.
alter function public.check_write_pin() set search_path = public;

-- ============================================================
--  KIỂM TRA sau khi chạy (chạy lại các lệnh này, kết quả mong đợi ghi bên phải):
--   POST <url>/storage/v1/object/list/attachments  (anon)  → [] hoặc lỗi (KHÔNG còn danh sách file)
--   POST <url>/rest/v1/rpc/_verify_admin           (anon)  → 401/42501 permission denied
--   Upload file trong app + mở file đính kèm cũ            → vẫn chạy bình thường
-- ============================================================

-- ĐỂ BIẾT THÊM về 34 lỗi "Policy Exists RLS Disabled" (có policy nhưng RLS đang TẮT nên policy chưa có tác dụng;
-- các policy này KHÔNG do repo này tạo): chạy câu dưới và gửi kết quả cho người phụ trách trước khi bật RLS:
--   select schemaname, tablename, policyname, cmd, roles, qual, with_check
--   from pg_policies where schemaname in ('public','storage') order by 1,2,3;
