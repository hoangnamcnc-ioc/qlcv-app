-- ============================================================
--  BƯỚC 1a — KHÓA BẢNG users (chạy trong Supabase > SQL Editor)
--
--  Mục tiêu: anon KHÔNG còn đọc được cột password (hash) nữa,
--  đăng nhập + đổi mật khẩu chuyển sang hàm chạy phía server.
--  KHÔNG làm vỡ app: các cột khác của users vẫn đọc được bình thường.
--
--  ⚠️ Sau khi chạy file này, PHẢI cập nhật code client (đã làm sẵn)
--     rồi build lại, nếu không phần đăng nhập sẽ lỗi.
-- ============================================================

-- Cần pgcrypto để băm SHA-256 trong Postgres (khớp định dạng "h$"+hex của app)
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- (A) Hàm ĐĂNG NHẬP — so hash phía server, KHÔNG bao giờ trả password
-- ------------------------------------------------------------
create or replace function public.login(p_username text, p_password text)
returns table(id text, username text, full_name text, role text, employee_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash   text;
  v_stored text;
  v_id     text;
begin
  v_hash := 'h$' || encode(digest(p_password, 'sha256'), 'hex');

  select u.password, u.id into v_stored, v_id
  from public.users u
  where u.username = p_username;

  if v_stored is null then
    return; -- không có user
  end if;

  if v_stored = v_hash then
    null; -- đúng (đã hash)
  elsif v_stored = p_password then
    -- mật khẩu cũ còn lưu dạng plaintext -> nâng cấp lên hash
    update public.users set password = v_hash where id = v_id;
  else
    return; -- sai mật khẩu
  end if;

  return query
    select u.id, u.username, u.full_name, u.role, u.employee_id
    from public.users u
    where u.id = v_id;
end;
$$;

revoke all on function public.login(text, text) from public;
grant execute on function public.login(text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- (B) Hàm ĐỔI MẬT KHẨU — bắt buộc đúng mật khẩu hiện tại
-- ------------------------------------------------------------
create or replace function public.change_password(p_username text, p_current text, p_new text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stored text;
  v_cur    text;
begin
  if length(coalesce(p_new, '')) < 6 then
    return false;
  end if;

  select password into v_stored from public.users where username = p_username;
  if v_stored is null then
    return false;
  end if;

  v_cur := 'h$' || encode(digest(p_current, 'sha256'), 'hex');
  if v_stored <> v_cur and v_stored <> p_current then
    return false; -- sai mật khẩu hiện tại
  end if;

  update public.users
  set password = 'h$' || encode(digest(p_new, 'sha256'), 'hex')
  where username = p_username;
  return true;
end;
$$;

revoke all on function public.change_password(text, text, text) from public;
grant execute on function public.change_password(text, text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- (C) ẨN cột password khỏi anon (đây là phần bịt lỗ hổng chính)
--     Thu hồi quyền đọc cả bảng, rồi chỉ cấp lại các cột AN TOÀN.
-- ------------------------------------------------------------
revoke select on public.users from anon, authenticated;
grant  select (id, username, full_name, role, employee_id)
       on public.users to anon, authenticated;

-- ============================================================
--  KIỂM TRA LẠI: chạy lại để xác nhận anon không còn SELECT cột password
--    SELECT grantee, privilege_type, column_name
--    FROM information_schema.column_privileges
--    WHERE table_name='users' AND grantee='anon';
--  -> sẽ KHÔNG thấy dòng nào có column_name = 'password'
-- ============================================================
