-- ============================================================
--  BƯỚC 1c — PHẦN A: thêm cột chức năng + RPC đọc/ghi hr (CHẠY TRƯỚC, khi code CŨ còn chạy — an toàn)
--  Phần này KHÔNG khóa gì, chỉ thêm cột + hàm nên không ảnh hưởng app đang chạy.
--  THỨ TỰ TRIỂN KHAI:  (1) chạy 45a  →  (2) deploy code mới (Vercel)  →  (3) chạy 45b (khóa cột hr).
--  Chạy CẢ FILE trong Supabase > SQL Editor.
-- ============================================================

-- (1) Tách 2 field CHỨC NĂNG ra cột riêng (để không gãy oversight/chuyển phòng khi khóa hr)
alter table public.employees add column if not exists oversees_dept text;   -- BGĐ phụ trách phòng nào
alter table public.employees add column if not exists hr_audit    jsonb;     -- nhật ký chuyển phòng
update public.employees set oversees_dept = nullif(hr->>'oversees_dept','')
  where hr ? 'oversees_dept' and coalesce(hr->>'oversees_dept','') <> '' and oversees_dept is null;
update public.employees set hr_audit = hr->'_audit'
  where hr ? '_audit' and hr_audit is null;

-- (2) RPC đọc hr có xác thực: admin/director xem TẤT CẢ; người khác chỉ xem hồ sơ của CHÍNH MÌNH
create or replace function public.get_employees_hr(p_user text, p_pass text)
returns table(id text, hr jsonb) language plpgsql security definer set search_path = public as $$
declare v_stored text; v_role text; v_eid text;
begin
  select password, role, employee_id into v_stored, v_role, v_eid from public.users where username = p_user;
  if v_stored is null then raise exception 'Sai tài khoản'; end if;
  if v_stored <> 'h$' || encode(sha256(convert_to(p_pass,'UTF8')),'hex') and v_stored <> p_pass then
    raise exception 'Sai mật khẩu';
  end if;
  if v_role in ('admin','director') then
    return query select e.id, e.hr from public.employees e;
  else
    return query select e.id, e.hr from public.employees e where e.id = v_eid;
  end if;
end; $$;

-- (3) RPC ghi hr (chỉ admin/director) — dùng khi lưu Hồ sơ nhân sự
create or replace function public.set_employee_hr(p_user text, p_pass text, p_id text, p_hr jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_stored text; v_role text;
begin
  select password, role into v_stored, v_role from public.users where username = p_user;
  if v_stored is null then raise exception 'Sai tài khoản'; end if;
  if v_stored <> 'h$' || encode(sha256(convert_to(p_pass,'UTF8')),'hex') and v_stored <> p_pass then
    raise exception 'Sai mật khẩu';
  end if;
  if v_role not in ('admin','director') then raise exception 'Chỉ Admin/Giám đốc được sửa hồ sơ nhân sự'; end if;
  update public.employees set hr = p_hr where id = p_id;
  return true;
end; $$;

revoke all on function public.get_employees_hr(text,text) from public;
revoke all on function public.set_employee_hr(text,text,text,jsonb) from public;
grant execute on function public.get_employees_hr(text,text) to anon, authenticated;
grant execute on function public.set_employee_hr(text,text,text,jsonb) to anon, authenticated;
