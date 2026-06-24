-- ============================================================
--  BƯỚC 1a — BẢN VÁ 2: không phụ thuộc pgcrypto nữa.
--  Dùng sha256() có sẵn trong PostgreSQL (PG 11+), nằm ở pg_catalog
--  nên luôn tìm thấy. convert_to(...,'UTF8') để băm đúng byte UTF-8,
--  khớp với cách app băm ở trình duyệt.
--  Chạy lại CẢ FILE này trong Supabase > SQL Editor.
-- ============================================================

-- (A) Hàm đăng nhập
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
  v_hash := 'h$' || encode(sha256(convert_to(p_password, 'UTF8')), 'hex');

  select u.password, u.id into v_stored, v_id
  from public.users u
  where u.username = p_username;

  if v_stored is null then
    return;
  end if;

  if v_stored = v_hash then
    null;
  elsif v_stored = p_password then
    update public.users set password = v_hash where id = v_id;
  else
    return;
  end if;

  return query
    select u.id, u.username, u.full_name, u.role, u.employee_id
    from public.users u
    where u.id = v_id;
end;
$$;

revoke all on function public.login(text, text) from public;
grant execute on function public.login(text, text) to anon, authenticated;

-- (B) Hàm đổi mật khẩu
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

  v_cur := 'h$' || encode(sha256(convert_to(p_current, 'UTF8')), 'hex');
  if v_stored <> v_cur and v_stored <> p_current then
    return false;
  end if;

  update public.users
  set password = 'h$' || encode(sha256(convert_to(p_new, 'UTF8')), 'hex')
  where username = p_username;
  return true;
end;
$$;

revoke all on function public.change_password(text, text, text) from public;
grant execute on function public.change_password(text, text, text) to anon, authenticated;

-- ============================================================
--  KIỂM TRA NHANH ngay trong SQL Editor (thay <mat_khau> bằng mật khẩu thật):
--    SELECT * FROM login('admin', '<mat_khau>');
--  -> Nếu trả về 1 dòng (id, username, role...) là hàm chạy đúng.
--  -> Nếu trả về 0 dòng = sai mật khẩu (hoặc mật khẩu trong DB đang ở
--     dạng khác). Xem mục dưới.
-- ============================================================

-- Nếu vẫn 0 dòng, kiểm tra mật khẩu admin đang lưu thế nào:
--    SELECT username, left(password, 2) AS dau, length(password) AS do_dai
--    FROM users WHERE username = 'admin';
--  - dau = 'h$' và do_dai = 66  -> đang là hash SHA-256 (đúng chuẩn app)
--  - khác vậy -> đang là plaintext, hàm vẫn so khớp được ở nhánh elsif.
