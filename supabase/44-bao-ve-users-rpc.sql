-- ============================================================
--  BƯỚC 1b — KHÓA GHI BẢNG users (chống tạo admin giả / đổi mật khẩu người khác qua anon key)
--  App không dùng Supabase Auth → mọi request là 'anon'. Trước đây anon INSERT/UPDATE/DELETE được
--  bảng users → ai có anon key (nằm trong bundle JS) có thể tạo admin giả hoặc reset mật khẩu bất kỳ.
--  Giải pháp: mọi thao tác tài khoản đi qua RPC SECURITY DEFINER, YÊU CẦU xác thực lại mật khẩu admin.
--  Chạy CẢ FILE trong Supabase > SQL Editor. (Băm mật khẩu khớp login: 'h$' || sha256 hex.)
-- ============================================================

-- Helper nội bộ: xác thực 1 admin theo username + mật khẩu (hash hoặc plaintext cũ, giống login)
create or replace function public._verify_admin(p_user text, p_pass text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_stored text; v_role text;
begin
  select password, role into v_stored, v_role from public.users where username = p_user;
  if v_stored is null or v_role <> 'admin' then return false; end if;
  return v_stored = 'h$' || encode(sha256(convert_to(p_pass, 'UTF8')), 'hex') or v_stored = p_pass;
end; $$;
revoke all on function public._verify_admin(text, text) from public;  -- chỉ các RPC dưới (cùng owner) gọi

-- Thêm / sửa tài khoản (p_id rỗng/không tồn tại = thêm mới; có = sửa). Chỉ đổi mật khẩu khi p_password khác rỗng.
create or replace function public.admin_upsert_user(
  p_admin_user text, p_admin_pass text,
  p_id text, p_username text, p_password text, p_full_name text, p_role text, p_employee_id text)
returns text language plpgsql security definer set search_path = public as $$
declare v_hash text;
begin
  if not public._verify_admin(p_admin_user, p_admin_pass) then raise exception 'Sai mật khẩu quản trị hoặc không có quyền'; end if;
  if coalesce(p_username,'') = '' or coalesce(p_full_name,'') = '' then raise exception 'Thiếu tên đăng nhập/họ tên'; end if;
  if p_role not in ('admin','director','manager_hcth','manager','deputy_manager','staff') then raise exception 'Vai trò không hợp lệ'; end if;

  if p_id is not null and exists (select 1 from public.users where id = p_id) then
    update public.users set username = p_username, full_name = p_full_name, role = p_role, employee_id = nullif(p_employee_id,'') where id = p_id;
    if coalesce(p_password,'') <> '' then
      update public.users set password = 'h$' || encode(sha256(convert_to(p_password,'UTF8')),'hex') where id = p_id;
    end if;
    return p_id;
  else
    if coalesce(p_password,'') = '' then raise exception 'Tài khoản mới cần mật khẩu'; end if;
    if exists (select 1 from public.users where username = p_username) then raise exception 'Tên đăng nhập đã tồn tại'; end if;
    v_hash := 'h$' || encode(sha256(convert_to(p_password,'UTF8')),'hex');
    insert into public.users(id, username, password, full_name, role, employee_id)
    values (coalesce(nullif(p_id,''), 'u' || (floor(extract(epoch from now())*1000))::bigint::text),
            p_username, v_hash, p_full_name, p_role, nullif(p_employee_id,''));
    return 'ok';
  end if;
end; $$;

-- Xóa tài khoản (không cho xóa admin gốc)
create or replace function public.admin_delete_user(p_admin_user text, p_admin_pass text, p_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public._verify_admin(p_admin_user, p_admin_pass) then raise exception 'Sai mật khẩu quản trị hoặc không có quyền'; end if;
  if p_id = 'admin001' then raise exception 'Không thể xóa tài khoản admin gốc'; end if;
  delete from public.users where id = p_id;
  return true;
end; $$;

-- Đặt lại mật khẩu về mặc định abc123
create or replace function public.admin_reset_password(p_admin_user text, p_admin_pass text, p_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public._verify_admin(p_admin_user, p_admin_pass) then raise exception 'Sai mật khẩu quản trị hoặc không có quyền'; end if;
  update public.users set password = 'h$' || encode(sha256(convert_to('abc123','UTF8')),'hex') where id = p_id;
  return true;
end; $$;

-- Cấp quyền GỌI cho anon (bảo mật nằm ở việc RPC tự kiểm tra mật khẩu admin bên trong)
revoke all on function public.admin_upsert_user(text,text,text,text,text,text,text,text) from public;
revoke all on function public.admin_delete_user(text,text,text) from public;
revoke all on function public.admin_reset_password(text,text,text) from public;
grant execute on function public.admin_upsert_user(text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.admin_delete_user(text,text,text) to anon, authenticated;
grant execute on function public.admin_reset_password(text,text,text) to anon, authenticated;

-- ★ KHÓA GHI TRỰC TIẾP bảng users cho anon (login/change_password/admin_* vẫn chạy vì là SECURITY DEFINER)
revoke insert, update, delete, truncate on public.users from anon;
-- (Giữ nguyên quyền SELECT cột hạn chế đã cấp ở bước 1a: id, username, full_name, role, employee_id)

-- ============================================================
--  KIỂM TRA sau khi chạy:
--   1) Thao tác tài khoản trong app (thêm/sửa/xóa/reset) — app sẽ hỏi mật khẩu admin, nhập đúng là chạy.
--   2) Thử ghi trực tiếp bằng anon phải BỊ CHẶN:
--      curl -X POST '<url>/rest/v1/users' -H 'apikey:<anon>' -H 'Authorization:Bearer <anon>' \
--           -H 'Content-Type: application/json' -d '{"id":"x","username":"hack","role":"admin"}'
--      → phải trả 401/42501 (permission denied).
-- ============================================================
