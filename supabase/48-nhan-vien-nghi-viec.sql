-- ============================================================
--  48 — NHÂN VIÊN NGHỈ VIỆC: đánh dấu thay vì xóa (giữ nguyên lịch sử việc/điểm/bình luận/hồ sơ)
--  • employees.left_at (ngày nghỉ YYYY-MM-DD) + left_note (ghi chú). Còn dữ liệu cũ nguyên vẹn.
--  • users.disabled: khóa đăng nhập của người đã nghỉ (không xóa tài khoản). Hàm login() từ chối tài khoản bị khóa.
--  • RPC admin_set_account_disabled: chỉ Admin/Giám đốc (xác thực mật khẩu) khóa/mở tài khoản theo nhân viên.
--  Chạy CẢ FILE trong Supabase > SQL Editor. Chạy lại nhiều lần vẫn an toàn.
-- ============================================================

-- (1) Cột trạng thái nghỉ việc cho nhân viên — cấp quyền theo CỘT cho anon (bảng employees đang phân quyền theo cột từ bước 1c)
alter table public.employees add column if not exists left_at   text;
alter table public.employees add column if not exists left_note text;
grant select (left_at, left_note) on public.employees to anon;
grant insert (left_at, left_note) on public.employees to anon;
grant update (left_at, left_note) on public.employees to anon;

-- (2) Cột khóa tài khoản (anon KHÔNG đọc được cột này; chỉ hàm login và RPC bên dưới đọc/ghi)
alter table public.users add column if not exists disabled boolean not null default false;

-- (3) login(): giữ NGUYÊN hàm cũ (đổi tên thành _login_core, nội bộ) rồi bọc thêm kiểm tra "tài khoản bị khóa".
--     Làm theo cách này để không phải viết lại logic xác thực mật khẩu đang chạy (băm, nâng cấp mật khẩu cũ...).
do $$
begin
  if to_regprocedure('public._login_core(text,text)') is null then
    alter function public.login(text, text) rename to _login_core;
  end if;
end $$;
revoke all on function public._login_core(text, text) from public, anon, authenticated;

create or replace function public.login(p_username text, p_password text)
returns table(id text, username text, full_name text, role text, employee_id text)
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.users u where u.username = p_username and u.disabled) then
    return;  -- tài khoản đã khóa: trả rỗng như sai mật khẩu (không lộ thông tin)
  end if;
  return query select c.id, c.username, c.full_name, c.role, c.employee_id from public._login_core(p_username, p_password) c;
end; $$;
revoke all on function public.login(text, text) from public;
grant execute on function public.login(text, text) to anon, authenticated;

-- (4) Khóa/mở tài khoản theo nhân viên. Trả về số tài khoản bị thay đổi. Không cho khóa tài khoản admin hoặc chính mình.
create or replace function public.admin_set_account_disabled(p_admin_user text, p_admin_pass text, p_employee_id text, p_disabled boolean)
returns integer language plpgsql security definer set search_path = public as $$
declare v_stored text; v_role text; v_self text; n integer;
begin
  select password, role, id into v_stored, v_role, v_self from public.users where username = p_admin_user;
  if v_stored is null then raise exception 'Sai tài khoản'; end if;
  if v_stored <> 'h$' || encode(sha256(convert_to(p_admin_pass,'UTF8')),'hex') and v_stored <> p_admin_pass then
    raise exception 'Sai mật khẩu';
  end if;
  if v_role not in ('admin','director') then raise exception 'Chỉ Admin/Giám đốc được thực hiện'; end if;
  update public.users set disabled = coalesce(p_disabled, false)
   where employee_id = p_employee_id and role <> 'admin' and id <> v_self;
  get diagnostics n = row_count;
  return n;
end; $$;
revoke all on function public.admin_set_account_disabled(text, text, text, boolean) from public;
grant execute on function public.admin_set_account_disabled(text, text, text, boolean) to anon, authenticated;

-- ============================================================
--  KIỂM TRA sau khi chạy:
--   • GET <url>/rest/v1/employees?select=id,left_at           (anon) → 200
--   • GET <url>/rest/v1/users?select=disabled                 (anon) → 42501 (không đọc được)
--   • Đăng nhập tài khoản bình thường vẫn chạy.
--  ROLLBACK (nếu cần): drop function public.login(text,text);
--     alter function public._login_core(text,text) rename to login;
--     grant execute on function public.login(text,text) to anon, authenticated;
-- ============================================================
