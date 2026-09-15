-- ============================================================
--  BƯỚC 1c — PHẦN B: KHÓA cột hr (CHỈ CHẠY SAU KHI ĐÃ deploy code mới — nếu không code cũ select("*") sẽ gãy)
--  Điều kiện: đã chạy 45a + code mới (không còn đọc thẳng cột hr) đã lên Vercel và chạy ổn.
--  Chạy CẢ FILE trong Supabase > SQL Editor.
-- ============================================================

-- Thu hồi mọi quyền của anon trên employees, chỉ cấp lại trên CÁC CỘT KHÔNG NHẠY CẢM (bỏ cột hr)
revoke select, insert, update on public.employees from anon;
grant select (id, name, dept, role, no_kpi, oversees_dept, hr_audit) on public.employees to anon;
grant insert (id, name, dept, role, no_kpi, oversees_dept, hr_audit) on public.employees to anon;
grant update (id, name, dept, role, no_kpi, oversees_dept, hr_audit) on public.employees to anon;
-- (giữ nguyên quyền DELETE nếu có — không đụng tới)

-- ============================================================
--  KIỂM TRA sau khi chạy:
--   1) Anon đọc hr trực tiếp phải BỊ CHẶN:  GET '<url>/rest/v1/employees?select=hr' → 42501
--   2) Đọc cột thường vẫn OK:               GET '<url>/rest/v1/employees?select=id,name,oversees_dept' → 200
--   3) Trong app QL Nhân sự → tab Hồ sơ: app hỏi mật khẩu → nhập đúng thì hiện/sửa được PII.
--  ROLLBACK (mở lại nếu cần): grant select, insert, update on public.employees to anon;
-- ============================================================
