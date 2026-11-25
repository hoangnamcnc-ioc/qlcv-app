-- ============================================================
--  51 — NHẮC NHẬP THƯ ĐIỆN TỬ
--  • user_has_email(p_user): app hỏi "tài khoản này đã có thư điện tử chưa?" mỗi lần mở app (kể cả phiên khôi phục sau F5)
--    để nhắc BẮT BUỘC nhập. Chỉ trả đúng/sai, không lộ địa chỉ.
--  • admin_missing_emails(...): Admin/Giám đốc xem danh sách tài khoản còn thiếu thư điện tử (xác thực mật khẩu).
--  Chạy CẢ FILE trong Supabase > SQL Editor (sau file 47). Chạy lại nhiều lần vẫn an toàn.
-- ============================================================
create or replace function public.user_has_email(p_user text)
returns boolean language sql security definer set search_path = public as $$
  select coalesce((select nullif(trim(coalesce(email, '')), '') is not null from public.users where username = p_user), true);
$$;
revoke all on function public.user_has_email(text) from public;
grant execute on function public.user_has_email(text) to anon, authenticated;

create or replace function public.admin_missing_emails(p_admin_user text, p_admin_pass text)
returns table(username text, full_name text, role text) language plpgsql security definer set search_path = public as $$
declare v_stored text; v_role text;
begin
  select password, users.role into v_stored, v_role from public.users where users.username = p_admin_user;
  if v_stored is null then raise exception 'Sai tài khoản'; end if;
  if v_stored <> 'h$' || encode(sha256(convert_to(p_admin_pass,'UTF8')),'hex') and v_stored <> p_admin_pass then
    raise exception 'Sai mật khẩu';
  end if;
  if v_role not in ('admin','director') then raise exception 'Chỉ Admin/Giám đốc được thực hiện'; end if;
  return query
    select u.username, u.full_name, u.role from public.users u
     where nullif(trim(coalesce(u.email, '')), '') is null
       and not coalesce(u.disabled, false)
       and u.role <> 'admin'
     order by u.full_name;
end; $$;
revoke all on function public.admin_missing_emails(text, text) from public;
grant execute on function public.admin_missing_emails(text, text) to anon, authenticated;
