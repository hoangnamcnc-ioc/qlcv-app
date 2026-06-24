-- ============================================================
--  CHẨN ĐOÁN BẢO MẬT — chạy trong Supabase > SQL Editor
--  Chỉ ĐỌC, không thay đổi gì. Xem kết quả 3 phần bên dưới.
-- ============================================================

-- (1) Bảng nào ĐÃ bật / CHƯA bật RLS?
--     rls_enabled = false  ➜  bảng đang MỞ HOÀN TOÀN cho anon key (NGUY HIỂM)
SELECT
  c.relname                        AS bang,
  c.relrowsecurity                 AS rls_enabled,
  c.relforcerowsecurity            AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'users','employees','tasks','recurring_templates','comments',
    'documents','duty_schedule','app_config','login_history',
    'projects','feedback'
  )
ORDER BY c.relrowsecurity ASC, c.relname;

-- (2) Hiện có chính sách (policy) nào không?
--     Nếu rỗng = chưa có policy nào cả.
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- (3) Quyền của vai trò 'anon' (khách chưa đăng nhập) trên bảng users.
--     Nếu thấy SELECT ở đây = bất kỳ ai cũng tải được hash mật khẩu.
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND grantee IN ('anon','authenticated')
ORDER BY grantee, privilege_type;
