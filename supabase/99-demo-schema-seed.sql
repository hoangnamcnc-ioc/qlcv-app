-- ============================================================
--  SCHEMA + DỮ LIỆU MẪU CHO PROJECT DEMO QLCV
--  Chạy TOÀN BỘ file này 1 LẦN trong Supabase project DEMO
--  (KHÔNG chạy vào project thật!) → SQL Editor → dán → Run
-- ============================================================

-- ───────────────────────── 1. TẠO BẢNG ─────────────────────────
create table other_tasks (
  id text primary key, name text, content text, team text, steps text,
  created date, created_by text
);
create table employees (
  id text primary key, name text, dept text, role text
);
create table comments (
  id text primary key, task_id text, user_name text, content text,
  created_at text, attachments text
);
create table users (
  id text primary key, username text unique, password text, full_name text,
  employee_id text, role text, is_top_director boolean default false
);
create table support_cases (
  id text primary key, channel text, content text, eid text, difficulty text,
  created date, created_by text, result text, category text, verified_by text,
  verified_at text, deleted boolean default false, attachments text
);
create table recurring_templates (
  id text primary key, title text, description text, dept text, eid text, prio text,
  frequency text, deadline_days integer, collab_eids text, collab_note text,
  active boolean default true, next_date text, last_created text,
  created_by text, created_by_id text
);
create table approval_delegations (
  id text primary key, delegator_id text, delegate_id text, dept text,
  start_date date, end_date date, revoked boolean default false,
  created_by text, created_at text
);
create table tasks (
  id text primary key, title text, description text, dept text, eid text, prio text,
  deadline text, completed boolean default false, created text, attachments text,
  progress integer default 0, history text, collab_eids text, collab_note text,
  template_id text, rating text, rating_note text, rated_by text, rated_at text,
  late_reason text, late_note text, deleted boolean default false,
  created_by_id text, forwarded_by text, created_by_name text,
  completed_at timestamp with time zone, completion_note text,
  suspicious_completion boolean default false, completion_requested boolean default false,
  requested_by text, requested_at text, viewed_at text, reminder_at text,
  ext_proposed text, ext_reason text, ext_requested_by text, ext_requested_at text,
  comment_reads text, weight numeric default 1
);
create table app_config (
  key text primary key, value text
);
create table monthly_scores (
  id text primary key, year integer, month integer, eid text, name text, dept text,
  score integer, eligible boolean default true, total numeric, done numeric,
  on_time numeric, completed_late numeric, over numeric, breakdown text,
  snapshot_at text, snapshot_by text
);
create table chat_channels (
  id text primary key, name text, is_general boolean default false, members text,
  created_by text, created_at text
);
create table chat_messages (
  id text primary key, channel_id text, sender_id text, sender_name text,
  content text, created_at text
);
create table projects (
  id text primary key, name text, dept text, fund_source text, total_budget numeric,
  spent numeric, lead_eid text, member_eids text, deadline text, note text, steps text,
  created text, created_by text, leader_id text, quality_rating smallint,
  quality_note text, quality_on_time boolean, quality_on_budget boolean,
  quality_rated_by text, quality_rated_at date, expense_type text,
  ext_proposed text, ext_reason text, ext_requested_by text, ext_requested_at text,
  budget_log text
);
create table duty_schedule (
  date text primary key, leader text, dc text, ioc text, note text, swaps text
);
create table feedback (
  id text primary key, type text, content text, author text,
  anonymous boolean default false, status text, reply text, created text
);
create table login_history (
  id text primary key, username text, full_name text, success boolean, at text
);
create table documents (
  id text primary key, type text, doc_number text, doc_date text, title text,
  sender text, task_id text, note text, attachments text, created text,
  created_by text, deadline date, forwards text
);

-- ───────────────────── 2. PHÂN QUYỀN CHO ANON ─────────────────────
-- Demo dùng dữ liệu giả nên cho anon toàn quyền để mọi tính năng chạy được
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

-- Riêng bảng users: ẩn cột password khỏi anon (giống bản thật), vẫn cho ghi các cột khác
revoke select on public.users from anon, authenticated;
grant select (id, username, full_name, role, employee_id, is_top_director) on public.users to anon, authenticated;

-- ───────────────────── 3. HÀM ĐĂNG NHẬP / ĐỔI MẬT KHẨU ─────────────────────
create or replace function public.login(p_username text, p_password text)
returns table(id text, username text, full_name text, role text, employee_id text)
language plpgsql security definer set search_path = public as $$
declare v_hash text; v_stored text; v_id text;
begin
  v_hash := 'h$' || encode(sha256(convert_to(p_password, 'UTF8')), 'hex');
  select u.password, u.id into v_stored, v_id from public.users u where u.username = p_username;
  if v_stored is null then return; end if;
  if v_stored = v_hash then null;
  elsif v_stored = p_password then update public.users u set password = v_hash where u.id = v_id;
  else return;
  end if;
  return query select u.id, u.username, u.full_name, u.role, u.employee_id from public.users u where u.id = v_id;
end;
$$;
revoke all on function public.login(text, text) from public;
grant execute on function public.login(text, text) to anon, authenticated;

create or replace function public.change_password(p_username text, p_current text, p_new text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_stored text; v_cur text;
begin
  if length(coalesce(p_new, '')) < 6 then return false; end if;
  select password into v_stored from public.users where username = p_username;
  if v_stored is null then return false; end if;
  v_cur := 'h$' || encode(sha256(convert_to(p_current, 'UTF8')), 'hex');
  if v_stored <> v_cur and v_stored <> p_current then return false; end if;
  update public.users set password = 'h$' || encode(sha256(convert_to(p_new, 'UTF8')), 'hex') where username = p_username;
  return true;
end;
$$;
revoke all on function public.change_password(text, text, text) from public;
grant execute on function public.change_password(text, text, text) to anon, authenticated;

-- ───────────────────────── 4. DỮ LIỆU MẪU ─────────────────────────

insert into employees (id, name, dept, role) values
('e1','Nguyễn Văn An','Phòng Kế toán','Trưởng phòng'),
('e2','Trần Thị Bình','Phòng Kế toán','Nhân viên'),
('e3','Lê Văn Cường','Phòng Kinh doanh','Trưởng phòng'),
('e4','Phạm Thị Dung','Phòng Kinh doanh','Nhân viên'),
('e5','Hoàng Văn Em','Phòng HC-TH','Chuyên viên'),
('e6','Đỗ Thị Phương','Ban Giám đốc','Giám đốc');

-- Mật khẩu demo cho mọi tài khoản: demo123 (tự động mã hoá khi đăng nhập lần đầu)
insert into users (id, username, password, full_name, employee_id, role, is_top_director) values
('u0','admin','demo123','Quản trị viên Demo','e6','admin', true),
('u1','an.nv','demo123','Nguyễn Văn An','e1','manager', false),
('u2','binh.tt','demo123','Trần Thị Bình','e2','member', false),
('u3','cuong.lv','demo123','Lê Văn Cường','e3','manager', false),
('u4','dung.pt','demo123','Phạm Thị Dung','e4','member', false),
('u5','em.hv','demo123','Hoàng Văn Em','e5','manager_hcth', false),
('u6','phuong.dt','demo123','Đỗ Thị Phương','e6','director', true);

insert into tasks (id, title, description, dept, eid, prio, deadline, completed, created, progress, created_by_id, created_by_name, completed_at) values
('t1','Lập báo cáo tài chính quý 2','Tổng hợp số liệu và lập BCTC quý 2/2026','Phòng Kế toán','e2','cao','2026-06-15', true, '2026-06-01T08:00:00Z', 100, 'u1','Nguyễn Văn An','2026-06-14T10:00:00Z'),
('t2','Đối chiếu công nợ khách hàng','Rà soát công nợ phải thu quý 2','Phòng Kế toán','e1','trung binh','2026-06-20', true, '2026-06-05T08:00:00Z', 100, 'u1','Nguyễn Văn An','2026-06-25T09:00:00Z'),
('t3','Chuẩn bị hồ sơ quyết toán thuế','Soạn hồ sơ quyết toán thuế TNDN năm 2025','Phòng Kế toán','e2','cao','2026-07-15', false, '2026-07-01T08:00:00Z', 60, 'u1','Nguyễn Văn An', null),
('t4','Xây dựng kế hoạch bán hàng Q3','Lập kế hoạch doanh số quý 3/2026','Phòng Kinh doanh','e4','cao','2026-07-10', false, '2026-06-25T08:00:00Z', 40, 'u3','Lê Văn Cường', null),
('t5','Chăm sóc khách hàng thân thiết','Gọi điện chăm sóc top 20 khách hàng','Phòng Kinh doanh','e4','trung binh','2026-06-10', true, '2026-06-01T08:00:00Z', 100, 'u3','Lê Văn Cường','2026-06-09T14:00:00Z'),
('t6','Rà soát hợp đồng lao động','Kiểm tra và cập nhật hợp đồng lao động hết hạn','Phòng HC-TH','e5','trung binh','2026-06-30', false, '2026-06-10T08:00:00Z', 20, 'u5','Hoàng Văn Em', null),
('t7','Tổ chức khám sức khoẻ định kỳ','Liên hệ đơn vị khám sức khoẻ cho nhân viên','Phòng HC-TH','e5','thap','2026-07-20', false, '2026-07-01T08:00:00Z', 0, 'u5','Hoàng Văn Em', null),
('t8','Nộp báo cáo thuế GTGT tháng 6','Kê khai và nộp tờ khai thuế GTGT','Phòng Kế toán','e1','cao','2026-07-05', false, '2026-06-28T08:00:00Z', 10, 'u1','Nguyễn Văn An', null);

update tasks set completion_requested = true, requested_by='u4', requested_at='2026-07-08T09:00:00Z' where id='t4';

insert into projects (id, name, dept, fund_source, total_budget, spent, lead_eid, member_eids, deadline, created, created_by, leader_id, quality_rating, quality_on_time, quality_on_budget) values
('p1','Nâng cấp phần mềm kế toán nội bộ','Phòng Kế toán','Ngân sách CNTT', 150000000, 80000000, 'e1', '["e1","e2"]', '2026-09-30', '2026-05-01T08:00:00Z','u1','u1', null, null, null),
('p2','Mở rộng thị trường khu vực Tây Nguyên','Phòng Kinh doanh','Ngân sách kinh doanh', 300000000, 300000000, 'e3', '["e3","e4"]', '2026-05-30', '2026-01-10T08:00:00Z','u3','u3', 5, true, true);

insert into comments (id, task_id, user_name, content, created_at) values
('c1','t3','Nguyễn Văn An','Đã có số liệu sơ bộ, đang chờ đối chiếu công nợ.', '2026-07-05T10:00:00Z'),
('c2','t4','Lê Văn Cường','Cần thêm dữ liệu doanh số tháng 6 để hoàn thiện kế hoạch.', '2026-07-02T15:30:00Z'),
('c3','t6','Hoàng Văn Em','Đã liên hệ 5/12 hợp đồng, tiếp tục cập nhật.', '2026-06-20T09:00:00Z');

insert into documents (id, type, doc_number, doc_date, title, sender, note, created, created_by) values
('d1','den','125/CV-STC','2026-06-20','Công văn hướng dẫn quyết toán thuế TNDN 2025','Cục Thuế tỉnh','Cần triển khai trước 15/7', '2026-06-21T08:00:00Z','u1'),
('d2','di','08/TB-KTBMT','2026-06-25','Thông báo lịch nghỉ lễ Quốc khánh 2026','Nội bộ',null, '2026-06-25T08:00:00Z','u5');

insert into duty_schedule (date, leader, dc, ioc, note) values
('2026-07-14','Đỗ Thị Phương','["Nguyễn Văn An"]','["Trần Thị Bình"]', null),
('2026-07-15','Đỗ Thị Phương','["Lê Văn Cường"]','["Phạm Thị Dung"]', null),
('2026-07-16','Đỗ Thị Phương','["Hoàng Văn Em"]','["Trần Thị Bình"]', 'Trực thay do nghỉ phép');

insert into feedback (id, type, content, author, anonymous, status, created) values
('f1','gop_y','Đề xuất bổ sung tính năng nhắc việc qua Zalo.','Trần Thị Bình', false, 'moi', '2026-07-01T09:00:00Z'),
('f2','loi','Bảng chấm điểm tháng đôi khi tải chậm.','Ẩn danh', true, 'da_xu_ly', '2026-06-15T09:00:00Z');

insert into app_config (key, value) values
('holidays', '["2026-01-01","2026-02-14","2026-02-15","2026-02-16","2026-04-30","2026-05-01","2026-09-02"]');

-- ============================================================
--  XONG. Đăng nhập thử: username bất kỳ ở trên (VD: admin) / mật khẩu: demo123
-- ============================================================
