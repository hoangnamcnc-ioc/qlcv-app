-- Luồng chuyển văn bản đến: chỉ Giám đốc thấy toàn bộ, chuyển cho Phó GĐ/TP/PTP thì người
-- nhận mới thấy được. Cần 2 cột mới:
--  - users.is_top_director: đánh dấu ĐÚNG 1 người là Giám đốc (khác các Phó Giám đốc cùng role "director")
--  - documents.forwards: lịch sử chuyển văn bản, dạng JSON [{to_id,to_name,to_role,by_id,by_name,at,note}]
alter table public.users add column if not exists is_top_director boolean not null default false;
alter table public.documents add column if not exists forwards text not null default '[]';

-- Cập nhật lại hàm login để trả thêm is_top_director (phải drop trước vì đổi kiểu trả về)
drop function if exists public.login(text, text);
create or replace function public.login(p_username text, p_password text)
returns table(id text, username text, full_name text, role text, employee_id text, is_top_director boolean)
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
    select u.id, u.username, u.full_name, u.role, u.employee_id, u.is_top_director
    from public.users u
    where u.id = v_id;
end;
$$;

revoke all on function public.login(text, text) from public;
grant execute on function public.login(text, text) to anon, authenticated;

-- Đánh dấu Võ Nguyễn Hoàng Nam (namvnh) là Giám đốc
update public.users set is_top_director = true where username = 'namvnh';
