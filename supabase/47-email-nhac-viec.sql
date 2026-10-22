-- ============================================================
--  47 — Email nhắc việc: lưu email của từng tài khoản (bảo vệ như dữ liệu cá nhân)
--  • Thêm cột users.email. Anon KHÔNG đọc được cột này (chỉ cấp quyền đọc theo từng cột ở bước 1a, cột mới không nằm trong đó).
--  • Mỗi người xem/đặt email CỦA CHÍNH MÌNH qua RPC có xác thực mật khẩu (get_my_email / set_my_email).
--  • Máy chủ Vercel (khóa service_role) đọc email để gửi nhắc việc hằng ngày.
--  Chạy CẢ FILE trong Supabase > SQL Editor.
-- ============================================================

alter table public.users add column if not exists email text;

-- Chắc chắn anon/authenticated không đọc được cột email (không làm gì nếu vốn đã không có quyền)
revoke select (email) on public.users from anon, authenticated;

-- Đọc email của chính mình ('' nếu chưa đặt). Sai mật khẩu → lỗi.
create or replace function public.get_my_email(p_user text, p_pass text)
returns text language plpgsql security definer set search_path = public as $$
declare v_stored text; v_email text;
begin
  select password, email into v_stored, v_email from public.users where username = p_user;
  if v_stored is null then raise exception 'Sai tài khoản'; end if;
  if v_stored <> 'h$' || encode(sha256(convert_to(p_pass,'UTF8')),'hex') and v_stored <> p_pass then
    raise exception 'Sai mật khẩu';
  end if;
  return coalesce(v_email, '');
end; $$;

-- Đặt/đổi email của chính mình. p_email rỗng = TẮT nhận email nhắc việc.
create or replace function public.set_my_email(p_user text, p_pass text, p_email text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_stored text; v_email text := lower(btrim(coalesce(p_email, '')));
begin
  select password into v_stored from public.users where username = p_user;
  if v_stored is null then raise exception 'Sai tài khoản'; end if;
  if v_stored <> 'h$' || encode(sha256(convert_to(p_pass,'UTF8')),'hex') and v_stored <> p_pass then
    raise exception 'Sai mật khẩu';
  end if;
  if v_email <> '' and (length(v_email) > 254 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$') then
    raise exception 'Email không hợp lệ';
  end if;
  update public.users set email = nullif(v_email, '') where username = p_user;
  return true;
end; $$;

revoke all on function public.get_my_email(text, text) from public;
revoke all on function public.set_my_email(text, text, text) from public;
grant execute on function public.get_my_email(text, text) to anon, authenticated;
grant execute on function public.set_my_email(text, text, text) to anon, authenticated;

-- ============================================================
--  KIỂM TRA sau khi chạy:
--   GET <url>/rest/v1/users?select=email   (anon)   → 42501 permission denied (không đọc được email)
--   Đăng nhập app → hộp "✉️ Email nhận nhắc việc" hiện ra nếu chưa đặt email.
-- ============================================================
