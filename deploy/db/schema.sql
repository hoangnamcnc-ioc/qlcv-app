-- ============================================================
--  QLCV — LƯỢC ĐỒ CƠ SỞ DỮ LIỆU CHO CÀI MỚI (không có dữ liệu cũ)
--  Tự sinh bằng deploy/db/build-schema.py từ: bảng nền (supabase/99) + các file đánh số 02..51 (theo thứ tự) + bước hoàn thiện quyền.
--  Chạy MỘT LẦN trên CSDL trống (deploy/db/apply-schema.sh). KHÔNG chạy trên CSDL đang có dữ liệu thật.
-- ============================================================

-- ───────── 1. BẢNG NỀN ─────────
-- ───────────────────────── 1. TẠO BẢNG ─────────────────────────
create table if not exists public.other_tasks (
  id text primary key, name text, content text, team text, steps text,
  created date, created_by text
);
create table if not exists public.employees (
  id text primary key, name text, dept text, role text
);
create table if not exists public.comments (
  id text primary key, task_id text, user_name text, content text,
  created_at text, attachments text
);
create table if not exists public.users (
  id text primary key, username text unique, password text, full_name text,
  employee_id text, role text, is_top_director boolean default false
);
create table if not exists public.support_cases (
  id text primary key, channel text, content text, eid text, difficulty text,
  created date, created_by text, result text, category text, verified_by text,
  verified_at text, deleted boolean default false, attachments text
);
create table if not exists public.recurring_templates (
  id text primary key, title text, description text, dept text, eid text, prio text,
  frequency text, deadline_days integer, collab_eids text, collab_note text,
  active boolean default true, next_date text, last_created text,
  created_by text, created_by_id text
);
create table if not exists public.approval_delegations (
  id text primary key, delegator_id text, delegate_id text, dept text,
  start_date date, end_date date, revoked boolean default false,
  created_by text, created_at text
);
create table if not exists public.tasks (
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
create table if not exists public.app_config (
  key text primary key, value text
);
create table if not exists public.monthly_scores (
  id text primary key, year integer, month integer, eid text, name text, dept text,
  score integer, eligible boolean default true, total numeric, done numeric,
  on_time numeric, completed_late numeric, over numeric, breakdown text,
  snapshot_at text, snapshot_by text
);
create table if not exists public.chat_channels (
  id text primary key, name text, is_general boolean default false, members text,
  created_by text, created_at text
);
create table if not exists public.chat_messages (
  id text primary key, channel_id text, sender_id text, sender_name text,
  content text, created_at text
);
create table if not exists public.projects (
  id text primary key, name text, dept text, fund_source text, total_budget numeric,
  spent numeric, lead_eid text, member_eids text, deadline text, note text, steps text,
  created text, created_by text, leader_id text, quality_rating smallint,
  quality_note text, quality_on_time boolean, quality_on_budget boolean,
  quality_rated_by text, quality_rated_at date, expense_type text,
  ext_proposed text, ext_reason text, ext_requested_by text, ext_requested_at text,
  budget_log text
);
create table if not exists public.duty_schedule (
  date text primary key, leader text, dc text, ioc text, note text, swaps text
);
create table if not exists public.feedback (
  id text primary key, type text, content text, author text,
  anonymous boolean default false, status text, reply text, created text
);
create table if not exists public.login_history (
  id text primary key, username text, full_name text, success boolean, at text
);
create table if not exists public.documents (
  id text primary key, type text, doc_number text, doc_date text, title text,
  sender text, task_id text, note text, attachments text, created text,
  created_by text, deadline date, forwards text
);


-- ───────── 2. QUYỀN NỀN CHO anon ─────────
-- ───────────────────── 2. PHÂN QUYỀN CHO ANON ─────────────────────
-- Demo dùng dữ liệu giả nên cho anon toàn quyền để mọi tính năng chạy được
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

-- Riêng bảng users: ẩn cột password khỏi anon (giống bản thật), vẫn cho ghi các cột khác
revoke select on public.users from anon, authenticated;
grant select (id, username, full_name, role, employee_id, is_top_director) on public.users to anon, authenticated;



-- ───────── 02-khoa-bang-users.sql ─────────
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


-- ───────── 03-sua-login-rpc.sql ─────────
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


-- ───────── 04-them-cot-quality.sql ─────────
-- Thêm các cột đánh giá chất lượng vào bảng projects
-- Chạy 1 lần trong Supabase SQL Editor

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS quality_rating      smallint,   -- 1-5 sao (đánh giá tổng thể)
  ADD COLUMN IF NOT EXISTS quality_note        text,       -- ghi chú nghiệm thu
  ADD COLUMN IF NOT EXISTS quality_on_time     boolean,    -- đúng tiến độ?
  ADD COLUMN IF NOT EXISTS quality_on_budget   boolean,    -- trong ngân sách?
  ADD COLUMN IF NOT EXISTS quality_rated_by    text,       -- người đánh giá
  ADD COLUMN IF NOT EXISTS quality_rated_at    date;       -- ngày đánh giá


-- ───────── 05-tao-bang-other-tasks.sql ─────────
-- Bảng lưu "Các nhiệm vụ khác" (nhiệm vụ theo tổ, không thuộc luồng nhiệm vụ ngân sách)
-- Chạy 1 lần trong Supabase SQL Editor

create table if not exists public.other_tasks (
  id           text primary key,
  name         text not null,
  content      text,
  team         text default '[]',   -- JSON: [{eid, role: "leader"|"deputy"|"member"}]
  steps        text default '[]',   -- JSON: [{id, content, deadline, lead_eid, collab_eids:[], status, note}]
  created      date default current_date,
  created_by   text
);

alter table public.other_tasks enable row level security;

drop policy if exists "other_tasks_all" on public.other_tasks;
create policy "other_tasks_all" on public.other_tasks
  for all using (true) with check (true);

grant select, insert, update, delete on public.other_tasks to anon, authenticated;


-- ───────── 06-them-cot-yeu-cau-hoan-thanh.sql ─────────
-- Thêm luồng "Yêu cầu hoàn thành → Chờ duyệt → Duyệt & đánh giá" cho bảng tasks
-- (Nhân viên không tự đánh dấu hoàn thành nữa; TP/PP/BGĐ duyệt và đánh giá cùng lúc)
-- Chạy 1 lần trong Supabase SQL Editor

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS completion_requested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS requested_by          text,
  ADD COLUMN IF NOT EXISTS requested_at          text;


-- ───────── 07-them-cot-da-xem.sql ─────────
-- Theo dõi trạng thái "Đã xem / Chưa xem" nhiệm vụ của người được giao (eid).
-- Ghi lại lần đầu tiên người được giao mở nhiệm vụ để xem chi tiết.
-- Chạy 1 lần trong Supabase SQL Editor

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS viewed_at text;


-- ───────── 08-them-cot-loai-chi.sql ─────────
-- Thêm cột phân loại "Chi Hoạt Động" / "Chi Mua Sắm" cho bảng projects (Nhiệm vụ ngân sách)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS expense_type text DEFAULT 'operating';


-- ───────── 09-tao-bang-ho-tro-nguoi-dung.sql ─────────
-- Bảng ghi nhận trường hợp hỗ trợ người dùng các nền tảng số dùng chung của tỉnh
-- qua điện thoại/Zalo/email. Mỗi trường hợp quy đổi thành điểm hiệu suất theo độ khó
-- (Khó = 1 việc, Trung bình = 1/2 việc, Nhanh = 1/4 việc) — xem src/hooks/useReports.js
-- Chạy 1 lần trong Supabase SQL Editor

create table if not exists public.support_cases (
  id           text primary key,
  channel      text not null,              -- phone | zalo | email
  content      text not null,
  eid          text not null,              -- nhân viên xử lý (employees.id)
  difficulty   text not null default 'medium', -- hard | medium | easy
  created      date default current_date,
  created_by   text
);

alter table public.support_cases enable row level security;

drop policy if exists "support_cases_all" on public.support_cases;
create policy "support_cases_all" on public.support_cases
  for all using (true) with check (true);

grant select, insert, update, delete on public.support_cases to anon, authenticated;


-- ───────── 10-them-cot-ket-qua-ho-tro.sql ─────────
-- Thêm cột nội dung kết quả giải quyết cho bảng support_cases (Hỗ trợ người dùng và xử lý PAHT)
ALTER TABLE public.support_cases ADD COLUMN IF NOT EXISTS result text;


-- ───────── 11-them-cot-phan-loai-ho-tro.sql ─────────
-- Thêm cột phân loại "Hỗ trợ người dùng và xử lý PAHT" / "Xử lý lỗi Trung tâm dữ liệu" cho bảng support_cases
ALTER TABLE public.support_cases ADD COLUMN IF NOT EXISTS category text DEFAULT 'support';


-- ───────── 12-them-cot-xac-nhan-va-xoa-mem.sql ─────────
-- Kiểm soát ghi nhận Hỗ trợ ND/PAHT: Trưởng/Phó phòng/BGĐ có thể xác nhận từng trường hợp,
-- và xóa chuyển vào thùng rác thay vì xóa vĩnh viễn ngay (tránh mất dấu vết khi rà soát).
ALTER TABLE public.support_cases ADD COLUMN IF NOT EXISTS verified_by text;
ALTER TABLE public.support_cases ADD COLUMN IF NOT EXISTS verified_at text;
ALTER TABLE public.support_cases ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false;


-- ───────── 13-them-cot-nhac-duyet.sql ─────────
-- Cho phép người yêu cầu duyệt "nhắc" người duyệt khi yêu cầu bị treo lâu
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reminder_at text;


-- ───────── 14-them-cot-de-xuat-gia-han.sql ─────────
-- Đề xuất & duyệt gia hạn deadline: nhân viên đề xuất ngày mới + lý do,
-- người giao việc duyệt đúng ngày đó hoặc rút ngắn hơn (nêu lý do), hoặc từ chối hẳn.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS ext_proposed text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS ext_reason text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS ext_requested_by text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS ext_requested_at text;


-- ───────── 15-them-cot-de-xuat-gia-han-du-an.sql ─────────
-- Đề xuất & duyệt gia hạn "Hạn hoàn thành" của dự án (Nhiệm vụ ngân sách):
-- Phụ trách chính đề xuất, chỉ Ban Giám đốc duyệt đúng ngày hoặc ngắn hơn (nêu lý do), hoặc từ chối.
-- Gia hạn từng bước dùng chung cột "steps" (JSON) có sẵn, không cần cột riêng.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ext_proposed text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ext_reason text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ext_requested_by text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ext_requested_at text;


-- ───────── 16-them-cot-danh-dau-da-xem-binh-luan.sql ─────────
-- Đánh dấu "đã xem bình luận" theo từng người: lưu JSON map { "<họ tên>": "<thời điểm xem gần nhất>" }
-- trên chính nhiệm vụ, để tính được ai có bình luận mới chưa đọc mà không cần bảng riêng.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS comment_reads text;


-- ───────── 17-tao-bang-uy-quyen-duyet.sql ─────────
-- Ủy quyền duyệt: Trưởng phòng ủy quyền cho Phó phòng duyệt thay nhiệm vụ trong 1 khoảng ngày cụ thể
-- (VD: đi công tác/nghỉ phép), tự động hết hiệu lực sau ngày kết thúc, hoặc thu hồi sớm bằng tay.
create table if not exists public.approval_delegations (
  id            text primary key,
  delegator_id  text not null,   -- users.id của người ủy quyền (Trưởng phòng)
  delegate_id   text not null,   -- users.id của người được ủy quyền (Phó phòng)
  dept          text not null,
  start_date    date not null,
  end_date      date not null,
  revoked       boolean not null default false,
  created_by    text,
  created_at    text
);

alter table public.approval_delegations enable row level security;

drop policy if exists "approval_delegations_all" on public.approval_delegations;
create policy "approval_delegations_all" on public.approval_delegations
  for all using (true) with check (true);

grant select, insert, update, delete on public.approval_delegations to anon, authenticated;


-- ───────── 18-them-cot-nhat-ky-ngan-sach.sql ─────────
-- Nhật ký thay đổi số liệu ngân sách của dự án: mỗi lần sửa "Tổng mức đầu tư" hoặc "Đã chi"
-- đều ghi lại ai sửa, lúc nào, từ bao nhiêu thành bao nhiêu — lưu JSON array trên chính dự án.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget_log text;


-- ───────── 19-tao-bang-chot-so-diem.sql ─────────
-- "Chốt sổ" điểm hiệu suất hàng tháng: lưu snapshot cố định điểm của từng nhân viên
-- ngay sau khi tháng kết thúc, để điểm quá khứ KHÔNG thay đổi khi dữ liệu sống bị sửa/xóa về sau.
-- Phục vụ phiếu xếp loại quý/năm (bình xét thi đua) — xem tab "Xếp loại" trong mục Báo cáo.
create table if not exists public.monthly_scores (
  id             text primary key,   -- ms<năm>_<tháng>_<eid>
  year           int not null,
  month          int not null,       -- 1-12
  eid            text not null,
  name           text,               -- lưu kèm tên/phòng tại thời điểm chốt (nhân sự có thể chuyển phòng sau này)
  dept           text,
  score          int,                -- null nếu chưa đủ điều kiện chấm điểm tháng đó
  eligible       boolean,
  total          numeric,
  done           numeric,
  on_time        numeric,
  completed_late numeric,
  over           numeric,
  breakdown      text,               -- JSON chi tiết "vì sao điểm này"
  snapshot_at    text,
  snapshot_by    text
);

alter table public.monthly_scores enable row level security;

-- Tạm dùng chính sách mở giống các bảng khác (ghi qua app có x-write-pin);
-- sẽ siết lại theo vai trò khi làm Bước 1b bảo mật.
drop policy if exists "monthly_scores_all" on public.monthly_scores;
create policy "monthly_scores_all" on public.monthly_scores
  for all using (true) with check (true);

grant select, insert, update, delete on public.monthly_scores to anon, authenticated;


-- ───────── 20-them-cot-dinh-kem-ho-tro.sql ─────────
-- Cho phép đính kèm file (ảnh chụp, log, tài liệu kết quả xử lý) vào từng trường hợp
-- Hỗ trợ người dùng/PAHT và Xử lý lỗi Trung tâm dữ liệu.
ALTER TABLE public.support_cases ADD COLUMN IF NOT EXISTS attachments text;


-- ───────── 21-them-cot-trong-so-nhiem-vu.sql ─────────
-- Trọng số quy đổi "việc" khi tính điểm hiệu suất, dùng cho nhiệm vụ sinh ra từ mẫu định kỳ
-- (Hàng ngày=0.25, Hàng tuần=0.5, 2 tuần=1, Hàng tháng=2, Hàng quý=2.5, 6 tháng=3, Hàng năm=3).
-- NULL = nhiệm vụ thường (không phải định kỳ), coi như 1 việc như trước giờ.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS weight numeric;


-- ───────── 22-them-cot-created-by-id-mau-dinh-ky.sql ─────────
-- Lưu id người tạo mẫu định kỳ (ngoài created_by là tên hiển thị) để nhiệm vụ tự sinh ra
-- có thể copy lại created_by_id, giúp đúng người đã tạo mẫu (thường là TP/PP) duyệt được
-- hoàn thành nhiệm vụ đó thay vì chỉ Admin/BGĐ mới duyệt được.
ALTER TABLE public.recurring_templates ADD COLUMN IF NOT EXISTS created_by_id text;


-- ───────── 23-luong-chuyen-van-ban-den.sql ─────────
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


-- ───────── 24-tao-bang-chat.sql ─────────
-- Kênh Chat nội bộ: 1 kênh "Chung" mặc định cho toàn cơ quan (ai cũng thấy, không cần mời),
-- và các kênh tự lập (nhóm/dự án...) do bất kỳ ai tạo, chọn thành viên khi tạo.
create table if not exists public.chat_channels (
  id          text primary key,      -- "general" cho kênh chung, "ch<timestamp>" cho kênh tự lập
  name        text not null,
  is_general  boolean not null default false,
  members     text not null default '[]',  -- JSON [user_id,...] — bỏ qua nếu is_general=true (ai cũng thấy)
  created_by  text,                  -- tên người tạo
  created_at  text
);

create table if not exists public.chat_messages (
  id          text primary key,      -- "cm<timestamp>_<rand>"
  channel_id  text not null references public.chat_channels(id) on delete cascade,
  sender_id   text,
  sender_name text,
  content     text not null,
  created_at  text
);

create index if not exists chat_messages_channel_idx on public.chat_messages(channel_id, created_at);

alter table public.chat_channels enable row level security;
alter table public.chat_messages enable row level security;

-- Tạm dùng chính sách mở giống các bảng khác (ghi qua app), sẽ siết lại theo vai trò ở Bước 1b bảo mật.
drop policy if exists "chat_channels_all" on public.chat_channels;
create policy "chat_channels_all" on public.chat_channels for all using (true) with check (true);
drop policy if exists "chat_messages_all" on public.chat_messages;
create policy "chat_messages_all" on public.chat_messages for all using (true) with check (true);

grant select, insert, update, delete on public.chat_channels to anon, authenticated;
grant select, insert, update, delete on public.chat_messages to anon, authenticated;

-- Bật Realtime cho bảng tin nhắn để chat cập nhật trực tiếp không cần tải lại trang
alter publication supabase_realtime add table public.chat_messages;

-- Tạo sẵn kênh "Chung" cho toàn cơ quan
insert into public.chat_channels (id, name, is_general, members, created_by, created_at)
values ('general', 'Chung', true, '[]', 'Hệ thống', now()::text)
on conflict (id) do nothing;


-- ───────── 25-them-cot-phoi-hop-ho-tro.sql ─────────
-- Thêm nhân viên phối hợp cho từng trường hợp Hỗ trợ ND/PAHT và Xử lý lỗi Trung tâm dữ liệu.
-- Người xử lý chính vẫn là cột "eid"; danh sách phối hợp lưu dạng JSON mảng id nhân viên (giống collab_eids của nhiệm vụ).
ALTER TABLE public.support_cases ADD COLUMN IF NOT EXISTS collab_eids text;


-- ───────── 26-them-cot-khoa-nhiem-vu-khac.sql ─────────
-- Cho phép "Kết thúc nhiệm vụ" ở Nhiệm vụ khác: khi locked = true thì khóa toàn bộ tương tác
-- (không sửa bước/trạng thái/đính kèm) cho tới khi Khôi phục (locked = false).
ALTER TABLE public.other_tasks ADD COLUMN IF NOT EXISTS locked boolean DEFAULT false;


-- ───────── 27-them-cot-khoa-du-an-ngan-sach.sql ─────────
-- Cho phép "Kết thúc dự án" ở Nhiệm vụ ngân sách: khi locked = true thì khóa toàn bộ tương tác
-- (không sửa bước/trạng thái/duyệt/nghiệm thu/gia hạn/trao đổi) cho tới khi Khôi phục (locked = false).
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS locked boolean DEFAULT false;


-- ───────── 28-them-cot-nhac-viec.sql ─────────
-- Nhắc việc (trưởng phòng/người giao đôn đốc người thực hiện): đếm số lần đã nhắc + mốc thời gian + ai nhắc.
-- Tách khỏi reminder_at (vốn dùng cho "nhắc duyệt" của nhân viên) để hai luồng không đè lên nhau.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS nudge_count integer DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS nudged_at text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS nudged_by text;


-- ───────── 29-them-cot-is-manager-monthly-scores.sql ─────────
-- Đánh dấu dòng chốt sổ của cấp quản lý (TP/PP) — điểm của họ là ĐIỂM ĐIỀU HÀNH (kết quả phòng),
-- khác bản chất với điểm hiệu suất cá nhân của nhân viên. Dùng để hiển thị chú thích trong phiếu xếp loại.
ALTER TABLE public.monthly_scores ADD COLUMN IF NOT EXISTS is_manager boolean DEFAULT false;


-- ───────── 30-them-cot-self-created-tasks.sql ─────────
-- Việc do NHÂN VIÊN tự tạo (sáng kiến/việc tự phát của cá nhân) — đánh dấu để định tuyến DUYỆT & CHẤM ĐIỂM
-- về Trưởng/Phó phòng (người tạo không được tự duyệt/tự chấm điểm cho mình).
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS self_created boolean DEFAULT false;


-- ───────── 31-app-config-kpi.sql ─────────
-- Cấu hình dùng chung toàn cơ quan (key-value). Bảng này đã có sẵn (đang lưu key='holidays').
-- Câu lệnh idempotent để chắc chắn tồn tại + có khóa chính trên 'key' cho các DB mới/demo.
CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value text
);

-- Chỉ tiêu tỷ lệ hoàn thành (KPI) mặc định 85% nếu chưa có (không ghi đè nếu BGĐ đã đặt).
INSERT INTO public.app_config (key, value)
VALUES ('kpi_ontime', '85')
ON CONFLICT (key) DO NOTHING;


-- ───────── 32-them-cot-no-kpi-employees.sql ─────────
-- Nhân sự khoán lương / làm nhiệm vụ riêng (bảo vệ…): KHÔNG giao việc trên hệ thống và KHÔNG tính KPI.
-- Cờ này loại họ khỏi: danh sách giao việc/phối hợp/chuyển tiếp, bảng hiệu suất & xếp hạng, đầu người phòng
-- (mẫu số điểm điều hành & tải bình quân), cảnh báo quá tải, so sánh khối lượng.
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS no_kpi boolean DEFAULT false;

-- Đánh dấu 2 bảo vệ phòng HCTH (khoán lương). Sau này thêm/bớt bằng ô tích trong form Nhân viên.
UPDATE public.employees SET no_kpi = true
WHERE dept = 'HCTH' AND name IN ('Nguyễn Sỹ Hợp', 'Nguyễn Tiến Quang');


-- ───────── 33-them-cot-late-excused.sql ─────────
-- Miễn phạt trễ khách quan: việc trễ vì lý do NGOÀI TẦM KIỂM SOÁT của người thực hiện (chờ ý kiến cấp trên,
-- phụ thuộc đơn vị khác…). Trưởng/Phó phòng/BGĐ đánh dấu → không trừ điểm phạt khi chấm hiệu suất:
--   completed_late (HT trễ) được đánh dấu → coi như đúng hạn; overdue được đánh dấu → loại khỏi mẫu số điểm.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS late_excused boolean DEFAULT false;


-- ───────── 34-them-cot-checklist-tasks.sql ─────────
-- Checklist con trong 1 nhiệm vụ: mảng JSON [{ "text": "...", "done": false }]. Tick/bỏ tick các mục
-- sẽ tự cập nhật % tiến độ của nhiệm vụ (= số mục đã tick / tổng số mục).
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS checklist text DEFAULT '[]';


-- ───────── 35-them-cot-depends-on-tasks.sql ─────────
-- Phụ thuộc giữa nhiệm vụ: 1 nhiệm vụ có thể "chờ" 1 nhiệm vụ khác hoàn thành trước mới được hoàn thành.
-- depends_on lưu id của nhiệm vụ phải xong trước. Rỗng = không phụ thuộc.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS depends_on text;


-- ───────── 36-them-cot-budget-links-documents.sql ─────────
-- Ghi nhận văn bản đã được gán vào bước nào của nhiệm vụ ngân sách nào (có thể nhiều bước/dự án).
-- Mảng JSON: [{ "project_id","project_name","step_id","step_content" }]. Dùng để hiển thị nhãn "Đã gán ngân sách".
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS budget_links text DEFAULT '[]';


-- ───────── 37-tao-bang-chat-hoc.sql ─────────
-- Trợ lý chat TỰ HỌC: lưu câu hỏi + phản hồi (👍/👎) + câu "dạy lại" để lần sau trả lời tốt hơn.
-- Đây là dữ liệu huấn luyện cho bộ phân loại TF-IDF + KNN chạy ngay trong trình duyệt (không cần AI ngoài).
create table if not exists public.chat_learning (
  id          text primary key,          -- "cl<timestamp>_<rand>"
  username    text,                       -- người tương tác (để thống kê)
  question    text not null,              -- câu người dùng đã hỏi (nguyên văn)
  norm_q      text,                       -- câu đã chuẩn hoá (bỏ dấu, thường) để so khớp
  intent      text,                       -- loại đáp án hệ thống chọn (guide/rank/tasks/unknown...)
  feedback    smallint default 0,         -- 1 = hữu ích (👍), -1 = chưa đúng (👎), 0 = không đánh giá
  corrected_q text,                       -- câu người dùng "dạy lại" khi bấm 👎 (ý đúng)
  promoted    boolean default false,      -- admin đã duyệt để thành alias chính thức (dành cho sau này)
  created_at  text
);

create index if not exists chat_learning_norm_idx on public.chat_learning(norm_q);

alter table public.chat_learning enable row level security;

-- Tạm dùng chính sách mở giống các bảng khác (ghi qua app), sẽ siết theo vai trò ở Bước 1b bảo mật.
drop policy if exists "chat_learning_all" on public.chat_learning;
create policy "chat_learning_all" on public.chat_learning for all using (true) with check (true);

grant select, insert, update, delete on public.chat_learning to anon, authenticated;


-- ───────── 38-them-cot-pending-create-tasks.sql ─────────
-- Việc nhân viên TỰ TẠO phải được Trưởng/Phó phòng duyệt trước khi thành việc chính thức.
-- pending_create = true  -> đang chờ duyệt (chưa tính vào danh sách/báo cáo/chấm điểm)
-- pending_create = false -> đã duyệt (việc chính thức, như cũ)
alter table public.tasks add column if not exists pending_create boolean not null default false;

-- Các việc đã tạo trước đây mặc định = false (đã là việc chính thức) — không cần đụng dữ liệu cũ.


-- ───────── 39-hr-column.sql ─────────
-- QL Nhân sự: thêm 1 cột JSON "hr" vào bảng employees để chứa toàn bộ hồ sơ nhân sự
-- (thông tin cá nhân, khen thưởng/kỷ luật, nghỉ phép). Chạy MỘT LẦN trong Supabase → SQL Editor.
-- Không xoá/đổi dữ liệu cũ; chỉ thêm cột mới, mặc định rỗng.

alter table public.employees add column if not exists hr jsonb;

-- (Tuỳ chọn) mô tả cấu trúc lưu trong hr — chỉ để tham khảo, không bắt buộc:
-- {
--   "dob":"1985-03-12","gender":"nam","ethnicity":"Kinh","cccd":"","phone":"","email":"","address":"",
--   "join_date":"2010-01-01","party_date":"","rank":"Chuyên viên","education":"Đại học CNTT","politics":"Trung cấp",
--   "rewards":[{"date":"2024-01-05","type":"reward","title":"Chiến sĩ thi đua","note":""}],
--   "leaves":[{"from":"2024-07-01","to":"2024-07-03","days":3,"type":"annual","reason":"Việc gia đình"}]
-- }


-- ───────── 40-departments.sql ─────────
-- Quản lý Phòng/Ban động: bảng departments. Chạy MỘT LẦN trong Supabase → SQL Editor.
-- "code" = mã nội bộ CỐ ĐỊNH (cái đang lưu ở employees.dept, tasks.dept…) — KHÔNG đổi để không hỏng dữ liệu cũ.
-- "name" = tên hiển thị (tự đặt đầy đủ, VD "Phòng HCTH", "Ban Giám đốc").
create table if not exists public.departments (
  code  text primary key,
  name  text not null,
  color text default '#6366f1',
  ord   int  default 0
);

-- Seed 3 phòng hiện có (idempotent — chạy lại không nhân đôi, không đè tên đã sửa).
insert into public.departments (code, name, color, ord) values
  ('HCTH',    'Phòng HCTH',    '#6366f1', 1),
  ('QL-KTDL', 'Phòng QL-KTDL', '#0ea5e9', 2),
  ('HT-NTS',  'Phòng HT-NTS',  '#10b981', 3)
on conflict (code) do nothing;


-- ───────── 42-them-cot-tu-choi-viec-tu-tao.sql ─────────
-- 42 — Thêm cột ghi nhận việc NHÂN VIÊN TỰ TẠO bị lãnh đạo phòng TỪ CHỐI (làm bằng chứng)
-- Trước đây từ chối = xóa mềm vào thùng rác (có thể bị dọn sạch → mất dấu vết). Nay GIỮ LẠI bản ghi,
-- đánh dấu create_rejected + lưu lý do/người/thời điểm từ chối. Lý do từ chối là BẮT BUỘC (kiểm ở app).
-- Chạy trong Supabase → SQL Editor.

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS create_rejected      boolean DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS create_reject_reason text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS create_rejected_by   text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS create_rejected_at   text;

-- (Tuỳ chọn) Đưa các việc tự tạo ĐÃ BỊ TỪ CHỐI trước đây (đang nằm trong thùng rác, deleted=true,
-- lịch sử có "Từ chối việc nhân viên tự tạo") trở lại dạng bằng chứng — bỏ comment nếu muốn khôi phục:
-- UPDATE public.tasks SET create_rejected = true, deleted = false
-- WHERE self_created = true AND deleted = true AND history::text LIKE '%Từ chối việc nhân viên tự tạo%';


-- ───────── 43-nhiem-vu-khac-tu-tao-cho-duyet.sql ─────────
-- 43 — "Nhiệm vụ khác": cho NHÂN VIÊN tự tạo + chờ Trưởng/Phó phòng duyệt (giống Nhiệm vụ chính)
-- Từ chối BẮT BUỘC lý do; việc bị từ chối GIỮ LẠI làm bằng chứng (không xóa). Chạy trong Supabase SQL Editor.

ALTER TABLE public.other_tasks ADD COLUMN IF NOT EXISTS pending_create       boolean DEFAULT false;  -- đang chờ duyệt
ALTER TABLE public.other_tasks ADD COLUMN IF NOT EXISTS self_created         boolean DEFAULT false;  -- do nhân viên tự tạo
ALTER TABLE public.other_tasks ADD COLUMN IF NOT EXISTS created_by_id        text;                    -- id người tạo (để lọc "của tôi")
ALTER TABLE public.other_tasks ADD COLUMN IF NOT EXISTS dept                 text;                    -- phòng của người tự tạo (để định tuyến người duyệt)
ALTER TABLE public.other_tasks ADD COLUMN IF NOT EXISTS create_rejected      boolean DEFAULT false;
ALTER TABLE public.other_tasks ADD COLUMN IF NOT EXISTS create_reject_reason text;
ALTER TABLE public.other_tasks ADD COLUMN IF NOT EXISTS create_rejected_by   text;
ALTER TABLE public.other_tasks ADD COLUMN IF NOT EXISTS create_rejected_at   text;


-- ───────── 44-bao-ve-users-rpc.sql ─────────
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


-- ───────── 45a-hr-cot-va-rpc.sql ─────────
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


-- ───────── 45b-khoa-cot-hr.sql ─────────
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


-- ───────── 47-email-nhac-viec.sql ─────────
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


-- ───────── 48-nhan-vien-nghi-viec.sql ─────────
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


-- ───────── 49-kpi-khung-don-vi.sql ─────────
-- ============================================================
--  49 — KPI THEO KHUNG ĐƠN VỊ
--  • tasks.rework_count: số lần bị yêu cầu làm lại (trừ 25% chất lượng mỗi lần).
--  • kpi_common: điểm TIÊU CHÍ CHUNG (tối đa 30) theo người/tháng, 3 lượt chấm (cá nhân, lãnh đạo phòng, lãnh đạo Trung tâm).
--  • kpi_catalog: DANH MỤC SẢN PHẨM CHUẨN (mã, đầu ra, nhóm N1–N5, điểm, hệ số quy đổi).
--  Chạy CẢ FILE trong Supabase > SQL Editor. Chạy lại nhiều lần vẫn an toàn.
-- ============================================================

alter table public.tasks add column if not exists rework_count integer not null default 0;
alter table public.tasks add column if not exists catalog_code text;

create table if not exists public.kpi_common (
  id      text primary key,            -- "<eid>_<năm>_<tháng>"
  eid     text not null,
  year    integer not null,
  month   integer not null,
  self    text,                        -- JSON {a,b,c}: 3 phần, mỗi phần tối đa 10
  dept    text,
  center  text,
  updated_by text,
  updated_at text
);

create table if not exists public.kpi_catalog (
  code     text primary key,           -- ví dụ CH.LD.001
  name     text not null,
  output   text,
  grp      text,                       -- N1..N5
  points   numeric,                    -- chấm điểm = giờ công × hệ số độ khó
  coef     numeric not null,           -- hệ số quy đổi = points / 5
  dept     text,                       -- NULL = dùng chung; hoặc mã phòng
  note     text,
  active   boolean not null default true
);

-- Dự án đang dùng khóa anon (không có RLS) → cấp quyền như các bảng khác
grant select, insert, update, delete on public.kpi_common  to anon, authenticated;
grant select, insert, update, delete on public.kpi_catalog to anon, authenticated;


-- ───────── 49b-kpi-catalog-seed.sql ─────────
-- Nạp DANH MỤC SẢN PHẨM CHUẨN từ tài liệu "Khung xây dựng KPI" (chạy SAU file 49). Chạy lại an toàn (bỏ qua mã đã có).
insert into public.kpi_catalog (code, name, output, grp, points, coef, dept, note) values
('CH.LD.001', 'Chương trình công tác lãnh đạo', 'Chương trình', 'N3', 48.0, 9.6, null, 'Chương trình công tác được phê duyệt, có nhiệm vụ, thời hạn, người phụ trách.'),
('CH.LD.002', 'Kết luận giao ban lãnh đạo', 'Kết luận', 'N2', 18.0, 3.6, null, 'Kết luận giao ban xác định rõ nội dung chỉ đạo, thời hạn và đơn vị/cá nhân thực hiện.'),
('CH.LD.003', 'Báo cáo điều hành', 'Báo cáo', 'N3', 48.0, 9.6, null, 'Báo cáo điều hành có kết quả chỉ đạo, nhiệm vụ trọng tâm, tồn tại và giải pháp.'),
('CH.LD.004', 'Hồ sơ phân công nhiệm vụ', 'Hồ sơ', 'N3', 24.0, 4.8, null, 'Hồ sơ phân công nhiệm vụ rõ người, rõ việc, rõ thời hạn và trách nhiệm.'),
('CH.LD.005', 'Hồ sơ phê duyệt kế hoạch công tác', 'Hồ sơ', 'N3', 24.0, 4.8, null, 'Hồ sơ phê duyệt kế hoạch công tác có ý kiến chỉ đạo/phê duyệt trên hệ thống.'),
('CH.LD.006', 'Hồ sơ chỉ đạo xử lý nhiệm vụ trọng tâm', 'Hồ sơ', 'N3', 24.0, 4.8, null, 'Hồ sơ chỉ đạo có nội dung xử lý, kết quả theo dõi và sản phẩm hoàn thành.'),
('CH.LD.007', 'Hồ sơ xử lý nhiệm vụ quá hạn/tồn đọng', 'Hồ sơ', 'N3', 24.0, 4.8, null, 'Hồ sơ xử lý có danh mục tồn đọng, biện pháp, kết quả khắc phục.'),
('CH.LD.008', 'Kết luận kiểm tra trách nhiệm', 'Kết luận', 'N3', 48.0, 9.6, null, 'Kết luận kiểm tra trách nhiệm có đánh giá, kiến nghị và thời hạn khắc phục.'),
('CH.LD.009', 'Hồ sơ đánh giá công chức/KPI', 'Hồ sơ', 'N3', 48.0, 9.6, null, 'Hồ sơ đánh giá có nhận xét, minh chứng, điểm KPI và kết quả phê duyệt.'),
('CH.LD.011', 'Báo cáo thực hiện nhiệm vụ được cấp trên giao', 'Báo cáo', 'N3', 48.0, 9.6, null, 'Báo cáo có kết quả thực hiện, minh chứng, khó khăn, kiến nghị.'),
('CH.LD.012', 'Phương án tổ chức xử lý nhiệm vụ phức tạp', 'Phương án', 'N4', 96.0, 19.2, null, 'Phương án có phân tích tình hình, giải pháp, phân công và tiến độ thực hiện.'),
('CH.VT.001', 'Tiếp nhận văn bản đến', 'Hồ sơ/văn bản', 'N1', 1.0, 0.2, null, 'Tiếp nhận văn bản đến được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.VT.002', 'Phân loại văn bản đến', 'Hồ sơ/văn bản', 'N0', 0.5, 0.1, null, 'Phân loại văn bản đến được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ,'),
('CH.VT.003', 'Trình xử lý văn bản đến', 'Hồ sơ/văn bản', 'N0', 0.5, 0.1, null, 'trình xử lý văn bản đến được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.VT.004', 'Phát hành văn bản đi', 'Hồ sơ/văn bản', 'N1', 1.0, 0.2, null, 'phát hành văn bản đi được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.VT.005', 'Kiểm tra thể thức văn bản', 'Hồ sơ/văn bản', 'N1', 1.0, 0.2, null, 'kiểm tra thể thức văn bản được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.VT.006', 'Sao y văn bản', 'Hồ sơ/văn bản', 'N0', 0.5, 0.1, null, 'sao y văn bản được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.VT.007', 'Sao lục hồ sơ', 'Hồ sơ/văn bản', 'N1', 1.0, 0.2, null, 'sao lục hồ sơ được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.VT.008', 'Quản lý văn bản mật', 'Hồ sơ/văn bản', 'N1', 1.5, 0.3, null, 'quản lý văn bản mật được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.VT.009', 'Lập hồ sơ công việc', 'Hồ sơ/văn bản', 'N1', 3.0, 0.6, null, 'lập hồ sơ công việc được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.VT.010', 'Thu thập hồ sơ nộp lưu', 'Hồ sơ/văn bản', 'N2', 6.0, 1.2, null, 'thu thập hồ sơ nộp lưu được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.VT.011', 'Chỉnh lý tài liệu lưu trữ', 'Sản phẩm', 'N3', 24.0, 4.8, null, 'chỉnh lý tài liệu lưu trữ được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.VT.012', 'Lập danh mục hồ sơ', 'Hồ sơ/văn bản', 'N1', 3.0, 0.6, null, 'lập danh mục hồ sơ được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.VT.013', 'Tra cứu hồ sơ lưu trữ', 'Hồ sơ/văn bản', 'N1', 1.0, 0.2, null, 'tra cứu hồ sơ lưu trữ được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.VT.014', 'Cung cấp hồ sơ lưu trữ', 'Hồ sơ/văn bản', 'N1', 1.5, 0.3, null, 'cung cấp hồ sơ lưu trữ được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.VT.015', 'Tiêu hủy tài liệu hết giá trị', 'Sản phẩm', 'N2', 18.0, 3.6, null, 'tiêu hủy tài liệu hết giá trị được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.VT.016', 'Số hóa tài liệu lưu trữ', 'Sản phẩm', 'N2', 12.0, 2.4, null, 'số hóa tài liệu lưu trữ được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.VT.017', 'Cập nhật sổ văn bản', 'Hồ sơ/văn bản', 'N1', 1.0, 0.2, null, 'cập nhật sổ văn bản được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.VT.018', 'Quản lý con dấu', 'Sản phẩm', 'N1', 1.5, 0.3, null, 'quản lý con dấu đúng quy chế.'),
('CH.VT.019', 'Lập báo cáo văn thư lưu trữ', 'Sản phẩm', 'N3', 24.0, 4.8, null, 'lập báo cáo văn thư lưu trữ được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.VT.020', 'Kiểm tra công tác văn thư lưu trữ', 'Sản phẩm', 'N3', 24.0, 4.8, null, 'kiểm tra công tác văn thư lưu trữ được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.001', 'Báo cáo nhanh', 'Sản phẩm', 'N2', 12.0, 2.4, null, 'báo cáo nhanh được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.002', 'Báo cáo tuần', 'Sản phẩm', 'N3', 24.0, 4.8, null, 'báo cáo tuần được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.003', 'Báo cáo tháng', 'Sản phẩm', 'N3', 48.0, 9.6, null, 'báo cáo tháng được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.004', 'Báo cáo quý', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'báo cáo quý được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.005', 'Báo cáo 6 tháng', 'Sản phẩm', 'N3', 48.0, 9.6, null, 'báo cáo 6 tháng được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.006', 'Báo cáo năm', 'Sản phẩm', 'N5', 240.0, 48.0, null, 'báo cáo năm được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.007', 'Báo cáo chuyên đề', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'báo cáo chuyên đề được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.008', 'Báo cáo đột xuất', 'Sản phẩm', 'N3', 48.0, 9.6, null, 'báo cáo đột xuất được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.009', 'Báo cáo sơ kết', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'báo cáo sơ kết được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.010', 'Báo cáo tổng kết', 'Sản phẩm', 'N5', 240.0, 48.0, null, 'báo cáo tổng kết được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.011', 'Báo cáo phục vụ họp UBND tỉnh', 'Sản phẩm', 'N5', 240.0, 48.0, null, 'báo cáo phục vụ họp ubnd tỉnh được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.012', 'Báo cáo phục vụ HĐND tỉnh', 'Sản phẩm', 'N5', 240.0, 48.0, null, 'báo cáo phục vụ hđnd tỉnh được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.013', 'Báo cáo gửi Bộ ngành Trung ương', 'Sản phẩm', 'N5', 240.0, 48.0, null, 'báo cáo gửi bộ ngành trung ương được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.014', 'Phụ lục tổng hợp dưới 10 đơn vị', 'Sản phẩm', 'N3', 48.0, 9.6, null, 'phụ lục tổng hợp dưới 10 đơn vị được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.015', 'Phụ lục tổng hợp 10-50 đơn vị', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'phụ lục tổng hợp 10-50 đơn vị được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.016', 'Phụ lục tổng hợp trên 50 đơn vị', 'Sản phẩm', 'N5', 240.0, 48.0, null, 'phụ lục tổng hợp trên 50 đơn vị được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.017', 'Phụ lục tổng hợp trên 100 đơn vị', 'Sản phẩm', 'N5', 480.0, 96.0, null, 'phụ lục tổng hợp trên 100 đơn vị được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.018', 'Biểu mẫu thống kê', 'Sản phẩm', 'N3', 60.0, 12.0, null, 'biểu mẫu thống kê được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.019', 'Phân tích số liệu chuyên sâu', 'Sản phẩm', 'N5', 240.0, 48.0, null, 'phân tích số liệu chuyên sâu được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.020', 'Thuyết minh số liệu', 'Sản phẩm', 'N3', 24.0, 4.8, null, 'thuyết minh số liệu được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.021', 'Tổng hợp ý kiến góp ý', 'Sản phẩm', 'N3', 24.0, 4.8, null, 'tổng hợp ý kiến góp ý được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.022', 'Báo cáo tiếp thu giải trình', 'Sản phẩm', 'N3', 24.0, 4.8, null, 'báo cáo tiếp thu giải trình được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.023', 'Báo cáo kết quả thực hiện nhiệm vụ', 'Sản phẩm', 'N3', 48.0, 9.6, null, 'báo cáo kết quả thực hiện nhiệm vụ được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.024', 'Báo cáo tiến độ nhiệm vụ', 'Sản phẩm', 'N3', 24.0, 4.8, null, 'báo cáo tiến độ nhiệm vụ được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.025', 'Báo cáo rủi ro, vướng mắc', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'báo cáo rủi ro, vướng mắc được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.BC.026', 'Báo cáo đánh giá tác động', 'Sản phẩm', 'N5', 240.0, 48.0, null, 'báo cáo đánh giá tác động được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.001', 'Công văn hành chính đơn giản', 'Sản phẩm', 'N2', 5.0, 1.0, null, 'công văn hành chính đơn giản được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.002', 'Công văn chuyên môn', 'Sản phẩm', 'N2', 10.0, 2.0, null, 'công văn chuyên môn được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.003', 'Công văn hướng dẫn nghiệp vụ', 'Sản phẩm', 'N2', 12.0, 2.4, null, 'công văn hướng dẫn nghiệp vụ được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.004', 'Công văn trả lời kiến nghị', 'Sản phẩm', 'N2', 12.0, 2.4, null, 'công văn trả lời kiến nghị được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.005', 'Công văn xin ý kiến', 'Sản phẩm', 'N2', 12.0, 2.4, null, 'công văn xin ý kiến được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.006', 'Công văn liên ngành', 'Sản phẩm', 'N3', 24.0, 4.8, null, 'công văn liên ngành được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.007', 'Công văn gửi Trung ương', 'Sản phẩm', 'N3', 24.0, 4.8, null, 'công văn gửi trung ương được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.008', 'Tờ trình thông thường', 'Sản phẩm', 'N3', 24.0, 4.8, null, 'tờ trình thông thường được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.009', 'Tờ trình chuyên đề', 'Sản phẩm', 'N3', 48.0, 9.6, null, 'tờ trình chuyên đề được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.010', 'Tờ trình nội dung lớn', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'tờ trình nội dung lớn được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.011', 'Tờ trình UBND tỉnh', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'tờ trình ubnd tỉnh được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.012', 'Tờ trình HĐND tỉnh', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'tờ trình hđnd tỉnh được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.013', 'Dự thảo quyết định cá biệt', 'Sản phẩm', 'N3', 24.0, 4.8, null, 'dự thảo quyết định cá biệt được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.014', 'Dự thảo quyết định nhân sự', 'Sản phẩm', 'N3', 24.0, 4.8, null, 'dự thảo quyết định nhân sự được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.015', 'Dự thảo quyết định chuyên ngành', 'Sản phẩm', 'N3', 48.0, 9.6, null, 'dự thảo quyết định chuyên ngành được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.017', 'Dự thảo quyết định phạm vi toàn tỉnh', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'dự thảo quyết định phạm vi toàn tỉnh được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.018', 'Thông báo đơn giản', 'Sản phẩm', 'N2', 5.0, 1.0, null, 'thông báo đơn giản được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.019', 'Thông báo kết luận', 'Sản phẩm', 'N2', 12.0, 2.4, null, 'thông báo kết luận được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.020', 'Thông báo chuyên môn', 'Sản phẩm', 'N2', 12.0, 2.4, null, 'thông báo chuyên môn được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.021', 'Thông báo liên ngành', 'Sản phẩm', 'N2', 12.0, 2.4, null, 'thông báo liên ngành được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.022', 'Biên bản họp', 'Sản phẩm', 'N2', 12.0, 2.4, null, 'biên bản họp được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.023', 'Biên bản làm việc', 'Sản phẩm', 'N2', 12.0, 2.4, null, 'biên bản làm việc được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.024', 'Biên bản kiểm tra', 'Sản phẩm', 'N3', 24.0, 4.8, null, 'biên bản kiểm tra được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.CV.025', 'Biên bản thẩm định', 'Sản phẩm', 'N3', 24.0, 4.8, null, 'biên bản thẩm định được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.001', 'Kế hoạch nội bộ', 'Sản phẩm', 'N3', 48.0, 9.6, null, 'kế hoạch nội bộ được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.002', 'Kế hoạch chuyên đề', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'kế hoạch chuyên đề được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.003', 'Kế hoạch năm', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'kế hoạch năm được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.004', 'Kế hoạch liên ngành', 'Sản phẩm', 'N4', 144.0, 28.8, null, 'kế hoạch liên ngành được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.005', 'Kế hoạch UBND tỉnh', 'Sản phẩm', 'N4', 144.0, 28.8, null, 'kế hoạch ubnd tỉnh được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.006', 'Chương trình công tác tháng', 'Sản phẩm', 'N3', 48.0, 9.6, null, 'chương trình công tác tháng được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.007', 'Chương trình công tác quý', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'chương trình công tác quý được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.008', 'Chương trình công tác năm', 'Sản phẩm', 'N4', 144.0, 28.8, null, 'chương trình công tác năm được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.009', 'Đề án nội bộ', 'Sản phẩm', 'N5', 320.0, 64.0, null, 'đề án nội bộ được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.010', 'Đề án ngành, lĩnh vực', 'Sản phẩm', 'N5', 500.0, 100.0, null, 'đề án ngành, lĩnh vực được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.011', 'Đề án liên ngành', 'Sản phẩm', 'N5', 500.0, 100.0, null, 'đề án liên ngành được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.012', 'Đề án trình UBND tỉnh', 'Sản phẩm', 'N5', 500.0, 100.0, null, 'đề án trình ubnd tỉnh được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.013', 'Phương án nội bộ', 'Sản phẩm', 'N3', 48.0, 9.6, null, 'phương án nội bộ được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.014', 'Phương án chuyên ngành', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'phương án chuyên ngành được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.015', 'Phương án liên ngành', 'Sản phẩm', 'N4', 144.0, 28.8, null, 'phương án liên ngành được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.016', 'Dự án chuyên môn', 'Sản phẩm', 'N5', 480.0, 96.0, null, 'dự án chuyên môn được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.017', 'Hồ sơ chủ trương nhiệm vụ', 'Hồ sơ/văn bản', 'N4', 96.0, 19.2, null, 'hồ sơ chủ trương nhiệm vụ được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.018', 'Khung nhiệm vụ trọng tâm', 'Sản phẩm', 'N4', 144.0, 28.8, null, 'khung nhiệm vụ trọng tâm được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.019', 'Kịch bản điều hành', 'Sản phẩm', 'N3', 48.0, 9.6, null, 'kịch bản điều hành được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.KH.020', 'Kế hoạch kiểm tra', 'Sản phẩm', 'N3', 48.0, 9.6, null, 'kế hoạch kiểm tra được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.001', 'Chuẩn bị cuộc họp nội bộ', 'Sản phẩm', 'N2', 12.0, 2.4, null, 'chuẩn bị cuộc họp nội bộ được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.002', 'Thư ký cuộc họp', 'Sản phẩm', 'N3', 24.0, 4.8, null, 'thư ký cuộc họp được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.003', 'Tài liệu họp', 'Sản phẩm', 'N3', 24.0, 4.8, null, 'tài liệu họp được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.004', 'Biên bản họp', 'Sản phẩm', 'N2', 12.0, 2.4, null, 'biên bản họp được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.005', 'Thông báo kết luận họp', 'Sản phẩm', 'N2', 12.0, 2.4, null, 'thông báo kết luận họp được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.006', 'Hội nghị cấp Trung tâm', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'hội nghị cấp sở được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.007', 'Hội nghị cấp tỉnh', 'Sản phẩm', 'N4', 144.0, 28.8, null, 'hội nghị cấp tỉnh được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.008', 'Lớp tập huấn', 'Sản phẩm', 'N4', 144.0, 28.8, null, 'lớp tập huấn được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.009', 'Tài liệu tập huấn', 'Sản phẩm', 'N3', 48.0, 9.6, null, 'tài liệu tập huấn được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.010', 'Danh sách học viên', 'Sản phẩm', 'N2', 5.0, 1.0, null, 'danh sách học viên được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.011', 'Báo cáo kết quả tập huấn', 'Sản phẩm', 'N3', 48.0, 9.6, null, 'báo cáo kết quả tập huấn được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.012', 'Hội thảo chuyên đề', 'Sản phẩm', 'N4', 144.0, 28.8, null, 'hội thảo chuyên đề được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.013', 'Tọa đàm nghiệp vụ', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'tọa đàm nghiệp vụ được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.014', 'Lễ công bố', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'lễ công bố được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.015', 'Họp trực tuyến', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'họp trực tuyến được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.016', 'Điều phối điểm cầu', 'Sản phẩm', 'N2', 5.0, 1.0, null, 'điều phối điểm cầu được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.017', 'Tổng hợp câu hỏi thảo luận', 'Sản phẩm', 'N3', 24.0, 4.8, null, 'tổng hợp câu hỏi thảo luận được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.018', 'Kịch bản chương trình', 'Sản phẩm', 'N3', 48.0, 9.6, null, 'kịch bản chương trình được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.019', 'Hồ sơ hậu cần sự kiện', 'Hồ sơ/văn bản', 'N3', 48.0, 9.6, null, 'hồ sơ hậu cần sự kiện được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.HN.020', 'Đánh giá sau tập huấn', 'Sản phẩm', 'N3', 48.0, 9.6, null, 'đánh giá sau tập huấn được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.001', 'Dự toán ngân sách năm', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'dự toán ngân sách năm được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.002', 'Dự toán bổ sung', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'dự toán bổ sung được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.003', 'Phân bổ dự toán', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'phân bổ dự toán được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.004', 'Rút dự toán', 'Sản phẩm', 'N2', 12.0, 2.4, null, 'rút dự toán được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.005', 'Chứng từ thanh toán', 'Sản phẩm', 'N2', 12.0, 2.4, null, 'chứng từ thanh toán được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.006', 'Đối chiếu kho bạc', 'Sản phẩm', 'N2', 12.0, 2.4, null, 'đối chiếu kho bạc được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.007', 'Báo cáo tài chính quý', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'báo cáo tài chính quý được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.008', 'Báo cáo quyết toán năm', 'Sản phẩm', 'N5', 240.0, 48.0, null, 'báo cáo quyết toán năm được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.009', 'Thẩm tra quyết toán đơn vị', 'Sản phẩm', 'N5', 240.0, 48.0, null, 'thẩm tra quyết toán đơn vị được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.010', 'Kiểm kê tài sản', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'kiểm kê tài sản được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.011', 'Thanh lý tài sản', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'thanh lý tài sản được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.012', 'Mua sắm tài sản', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'mua sắm tài sản được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.013', 'Hồ sơ đấu thầu mua sắm', 'Hồ sơ/văn bản', 'N4', 96.0, 19.2, null, 'hồ sơ đấu thầu mua sắm được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.014', 'Hồ sơ quyết toán gói thầu', 'Hồ sơ/văn bản', 'N5', 240.0, 48.0, null, 'hồ sơ quyết toán gói thầu được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.015', 'Quản lý công cụ dụng cụ', 'Sản phẩm', 'N2', 12.0, 2.4, null, 'quản lý công cụ dụng cụ được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.016', 'Theo dõi tài sản công', 'Sản phẩm', 'N2', 12.0, 2.4, null, 'theo dõi tài sản công được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.017', 'Quy chế chi tiêu nội bộ', 'Sản phẩm', 'N5', 240.0, 48.0, null, 'quy chế chi tiêu nội bộ được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.018', 'Báo cáo công khai tài chính', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'báo cáo công khai tài chính được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.019', 'Hồ sơ phí, lệ phí', 'Hồ sơ/văn bản', 'N2', 12.0, 2.4, null, 'hồ sơ phí, lệ phí được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.TC.020', 'Báo cáo tự chủ tài chính', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'báo cáo tự chủ tài chính được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.DX.001', 'Nhiệm vụ đột xuất cấp phòng', 'Sản phẩm', 'N3', 48.0, 9.6, null, 'nhiệm vụ đột xuất cấp phòng được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.DX.002', 'Nhiệm vụ đột xuất cấp sở', 'Sản phẩm', 'N4', 96.0, 19.2, null, 'nhiệm vụ đột xuất cấp sở được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.DX.003', 'Nhiệm vụ đột xuất UBND tỉnh', 'Sản phẩm', 'N5', 240.0, 48.0, null, 'nhiệm vụ đột xuất ubnd tỉnh được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.DX.004', 'Nhiệm vụ đột xuất Tỉnh ủy', 'Sản phẩm', 'N5', 240.0, 48.0, null, 'nhiệm vụ đột xuất tỉnh ủy được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.DX.005', 'Chuyên đề chiến lược', 'Sản phẩm', 'N5', 400.0, 80.0, null, 'chuyên đề chiến lược được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.DX.006', 'Đề án trọng điểm', 'Sản phẩm', 'N5', 320.0, 64.0, null, 'đề án trọng điểm được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.DX.007', 'Hồ sơ xử lý khủng hoảng', 'Hồ sơ/văn bản', 'N5', 320.0, 64.0, null, 'hồ sơ xử lý khủng hoảng được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.DX.008', 'Tổ công tác đặc biệt', 'Sản phẩm', 'N5', 240.0, 48.0, null, 'tổ công tác đặc biệt được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.DX.009', 'Báo cáo chuyên đề cấp bách', 'Sản phẩm', 'N5', 240.0, 48.0, null, 'báo cáo chuyên đề cấp bách được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.DX.010', 'Nhiệm vụ liên ngành phức tạp', 'Sản phẩm', 'N5', 240.0, 48.0, null, 'nhiệm vụ liên ngành phức tạp được hoàn thành, lưu vết trên hồ sơ điện tử hoặc văn bản/hồ sơ.'),
('CH.DU.001', 'Nghị quyết Đảng ủy/Chi bộ', 'Nghị quyết', 'N4', 96.0, 19.2, null, 'Nghị quyết được thông qua, ký ban hành và lưu hồ sơ sinh hoạt cấp ủy/chi bộ.'),
('CH.DU.002', 'Chương trình công tác Đảng', 'Chương trình', 'N4', 96.0, 19.2, null, 'Chương trình công tác Đảng có nhiệm vụ, tiến độ, phân công thực hiện.'),
('CH.DU.003', 'Kế hoạch kiểm tra, giám sát của Đảng', 'Kế hoạch', 'N4', 96.0, 19.2, null, 'Kế hoạch KTGS được cấp ủy/UBKT phê duyệt.'),
('CH.DU.004', 'Báo cáo công tác xây dựng Đảng', 'Báo cáo', 'N4', 96.0, 19.2, null, 'Báo cáo xây dựng Đảng có số liệu, đánh giá, nhiệm vụ, giải pháp.'),
('CH.DU.005', 'Hồ sơ kết nạp đảng viên', 'Hồ sơ', 'N4', 96.0, 19.2, null, 'Hồ sơ kết nạp đảng viên đầy đủ biểu mẫu, nhận xét, nghị quyết và quyết định.'),
('CH.DU.006', 'Hồ sơ công nhận đảng viên chính thức', 'Hồ sơ', 'N4', 96.0, 19.2, null, 'Hồ sơ chuyển chính thức có nhận xét, nghị quyết, quyết định và cập nhật sổ đảng.'),
('CH.DU.007', 'Hồ sơ đánh giá, xếp loại tổ chức Đảng/đảng viên', 'Hồ sơ', 'N3', 48.0, 9.6, null, 'Hồ sơ đánh giá có phiếu, biên bản, minh chứng và kết quả xếp loại.'),
('CH.DU.008', 'Hồ sơ kiểm tra tổ chức Đảng/đảng viên', 'Hồ sơ', 'N4', 96.0, 19.2, null, 'Hồ sơ kiểm tra có quyết định, báo cáo, biên bản, kết luận.'),
('CH.DU.009', 'Hồ sơ giám sát tổ chức Đảng/đảng viên', 'Hồ sơ', 'N4', 96.0, 19.2, null, 'Hồ sơ giám sát có kế hoạch, biên bản, báo cáo, kết luận/nhận xét.'),
('CH.DU.010', 'Tài liệu sinh hoạt chuyên đề', 'Tài liệu', 'N3', 24.0, 4.8, null, 'Tài liệu sinh hoạt chuyên đề được chuẩn bị, thông qua và lưu hồ sơ.'),
('CH.DU.011', 'Báo cáo công tác tuyên giáo/dân vận', 'Báo cáo', 'N3', 24.0, 4.8, null, 'Báo cáo có kết quả, mô hình, tồn tại, giải pháp.'),
('CH.DU.012', 'Hồ sơ thi đua, khen thưởng Đảng', 'Hồ sơ', 'N3', 48.0, 9.6, null, 'Hồ sơ đề nghị khen thưởng tổ chức Đảng/đảng viên đầy đủ minh chứng.'),
('HCTH-001', 'Nghiên cứu các văn bản quy phạm pháp luật, hướng dẫn của Trung ương và địa phương về công tác đấu thầu để tham mưu triển khai thực hiện', 'Thường xuyên', 'N3', 90.0, 18.0, 'HCTH', null),
('HCTH-002', 'Khảo sát, tham mưu xây dựng dự toán và kế hoạch đối với các nhiệm vụ thuộc nguồn vốn ngân sách nhà nước', 'Dự toán/ Kế hoạch', 'N3', 100.0, 20.0, 'HCTH', null),
('HCTH-003', 'Tham mưu ban hành kế hoạch lựa chọn nhà thầu đối với các gói thầu được giao.', 'Quyết định', 'N3', 80.0, 16.0, 'HCTH', null),
('HCTH-004', 'Thực hiện các quy trình đấu thầu đảm bảo tuân thủ theo các quy định hiện hành, tham mưu trình phê duyệt kết quả lựa chọn nhà thầu', 'Quyết định', 'N3', 100.0, 20.0, 'HCTH', null),
('HCTH-005', 'Khảo sát thị trường, tổng hợp báo giá, xây dựng dự toán và xác định giá gói thầu.', 'Báo giá', 'N3', 90.0, 18.0, 'HCTH', null),
('HCTH-006', 'Rà soát các tiêu chuẩn, nội dung của  hồ sơ yêu cầu, hồ sơ mời thầu và các hồ sơ liên quan mà các đơn vị tư vấn lập', 'Hồ sơ mời thầu', 'N3', 90.0, 18.0, 'HCTH', null),
('HCTH-007', 'Tham gia đánh giá hồ sơ dự thầu; rà soát năng lực, kinh nghiệm, năng lực tài chính, nhân sự và giải pháp kỹ thuật của nhà thầu.', 'Báo cáo đánh giá', 'N3', 120.0, 24.0, 'HCTH', null),
('HCTH-008', 'Tham mưu lựa chọn nhà thầu đáp ứng yêu cầu về kỹ thuật, chất lượng và hiệu quả kinh tế.', 'Công văn mời thầu', 'N3', 60.0, 12.0, 'HCTH', null),
('HCTH-009', 'Tham mưu lãnh đạo thực hiện thương thảo, đàm phán giá trị hợp đồng và các điều khoản thực hiện nhằm tiết kiệm ngân sách nhà nước.', 'Biên bản', 'N3', 90.0, 18.0, 'HCTH', null),
('HCTH-010', 'Thực hiện các thủ tục ký kết, quản lý, theo dõi thực hiện hợp đồng.', 'Hợp đồng', 'N2', 75.0, 15.0, 'HCTH', null),
('HCTH-011', 'Theo dõi tiến độ, nghiệm thu, thanh toán và quyết toán các gói thầu.', 'Biên bản', 'N3', 60.0, 12.0, 'HCTH', null),
('HCTH-012', 'Xây dựng danh mực hồ sơ, lưu trữ hồ sơ đấu thầu theo quy định', 'Danh mục', 'N2', 32.0, 6.4, 'HCTH', null),
('HCTH-013', 'Hỗ trợ các đơn vị hoàn thiện hồ sơ, thủ tục phục vụ công tác trình phê duyệt, bố trí kinh phí và tổ chức triển khai các nhiệm vụ công nghệ thông tin.', 'Thường xuyên', 'N2', 100.0, 20.0, 'HCTH', null),
('HCTH-014', 'Quản lý, theo dõi thu chi tài chính Đảng bảo đảm đúng chế độ, quy định hiện hành.', 'Sổ theo dõi', 'N2', 14.0, 2.8, 'HCTH', null),
('HCTH-015', 'Thực hiện thanh quyết toán các khoản kinh phí hoạt động, lưu chứng từ thanh toán', 'Sổ theo dõi', 'N2', 50.0, 10.0, 'HCTH', null),
('HCTH-016', 'Hoàn thiện biên bản các cuộc họp thường kỳ của Chi bộ bảo đảm đầy đủ nội dung, đúng quy định.', 'Biên bản', 'N2', 14.0, 2.8, 'HCTH', null),
('HCTH-017', 'Tham mưu các văn bản về tài chính, tổng hợp các số liệu và NSNN và báo cáo lại tiến độ giải ngân cho sở', 'Văn bản, báo cáo đánh giá', 'N3', 90.0, 18.0, 'HCTH', null),
('HCTH-018', 'Hàng quý tổng hợp xổ sách đối chiếu với kho bạc nhà nước', 'Đối chiếu kho bạc', 'N2', 40.0, 8.0, 'HCTH', null),
('HCTH-019', 'Hàng quý nộp báo cáo thuế', 'Báo cáo thuế', 'N2', 40.0, 8.0, 'HCTH', null),
('HCTH-020', 'Thanh quyết toán với sở', 'Báo cáo quyết toán', 'N3', 80.0, 16.0, 'HCTH', null),
('HCTH-021', 'Lên dự toán cho năm sau', 'Dự toán', 'N3', 100.0, 20.0, 'HCTH', null),
('HCTH-022', 'Tham mưu về việc thanh quyết toán các gói thầu, nhiệm vụ của Trung tâm', 'Hợp đồng', 'N3', 75.0, 15.0, 'HCTH', null),
('HCTH-023', 'Báo tăng, giảm lao động với BHXH khi có sự biến động về nhân sự của Trung tâm', 'Báo cáo', 'N2', 16.0, 3.2, 'HCTH', null),
('HCTH-024', 'Tham mưu lãnh đạo, soạn thảo HĐLĐ , Quyết định phân công nhiệm vụ cho nhân sự mới của Trung tâm', 'Hợp đồng, quyết định', 'N2', 16.0, 3.2, 'HCTH', null),
('HCTH-025', 'Rà soát, kiểm đếm hồ sơ viên chức ,người lao động của Trung tâm', 'Báo cáo', 'N2', 40.0, 8.0, 'HCTH', null),
('HCTH-026', 'Theo dõi xuất hóa đơn nguồn thu dịch vụ của Trung tâm khi có phát sinh', 'Hợp đồng, BBNTTL, Hoá đơn, Chứng từ Thanh toán Ngân hàng', 'N2', 60.0, 12.0, 'HCTH', null),
('HCTH-027', 'Làm hồ sơ, thủ tục thanh toán tạm ứng lương, công tác phí , chi các khoản chi từ nguồn thu dịch vụ của trung tâm khi có phát sinh', 'Giấy đề nghị, Phiếu chi, phiếu thu, chứng từ thanh toán  ngân hàng', 'N2', 60.0, 12.0, 'HCTH', null),
('HCTH-028', 'Theo dõi biến động tăng, giảm tài sản , công cụ dụng cụ trong năm của trung tâm', 'Biên bản bàn giao các phòng, hợp đồng mua sắm, chứng từ thanh toán kho bạc', 'N2', 60.0, 12.0, 'HCTH', null),
('HCTH-029', 'Tham mưu đề xuất mua sắm Văn phòng phẩm, thăm viếng, lễ tết của Trung tâm', 'Giấy đề xuất, Đề nghị Thanh toán, Giao nhận các phòng, hoá đơn, Chứng từ thanh toán kho bạc', 'N1', 16.0, 3.2, 'HCTH', null),
('HCTH-030', 'Lập bảng lương, BHXH, các chế độ khác hàng tháng của Trung tâm', 'Bảng lương, bảng tính BHXH, bảng thanh toán kho bạc', 'N2', 60.0, 12.0, 'HCTH', null),
('HCTH-031', 'Quản trị phòng họp phục vụ các cuộc họp', 'Báo cáo', 'N1', 2.0, 0.4, 'HCTH', null),
('HCTH-032', 'Tổng hợp nhiệm vụ tháng của từng cá nhân trong phòng', 'Báo cáo', 'N2', 30.0, 6.0, 'HCTH', null),
('HCTH-033', 'Theo dõi giờ giấc đi làm của Trung tâm', 'Báo cáo', 'N1', 1.0, 0.2, 'HCTH', null),
('QL-KTDL-001', 'HT CAMERA -QLVH- Kiểm tra tình trạng hoạt động dashboard, cảnh báo (uptime, lỗi hiển thị); theo dõi log hệ thống, xử lý sự cố phát sinh (nếu có)', 'Nhật ký phần mềm Camera an ninh, giám sát, TrafficID - Thường xuyên', 'N3', 6.6, 1.3, 'QL-KTDL', 'Cần phối hợp với đơn vị cung cấp phần mềm.'),
('QL-KTDL-002', 'Đắk Lắk Số và Cổng Tương tác công dân-Kiểm tra tình trạng hoạt động dashboard, cảnh báo (uptime, lỗi hiển thị); theo dõi log hệ thống, xử lý sự cố phát sinh (nếu có)', 'Nhật ký hoạt động - Thường xuyên', 'N3', 6.0, 1.2, 'QL-KTDL', 'Cần phối hợp với đơn vị phát triển phần mềm.'),
('QL-KTDL-003', 'REPUTA- QLVH-Kiểm tra tình trạng hoạt động dashboard, cảnh báo (uptime, lỗi hiển thị); theo dõi log hệ thống, xử lý sự cố phát sinh (nếu có)', 'Rà soát, điều chỉnh số liệu - Thực hiện Thường xuyên; 
Cập nhật nhật ký - Thực hiện Thường xuyên;
Cung cấp số liệu cho Phòng QLTT- Sở VH,TT&DL - Tổng hợp theo Tháng', 'N2', 3.6, 0.7, 'QL-KTDL', 'Cần đảm bảo bảo mật thông tin tài khoản.'),
('QL-KTDL-004', 'Quản trị, vận hành hệ thống Phản ánh hiện trường (Kiểm tra tình trạng hoạt động dashboard, cảnh báo (uptime, lỗi hiển thị); theo dõi log hệ thống, xử lý sự cố phát sinh (nếu có))', 'Nhật ký hoạt động - Thường xuyên', 'N3', 4.0, 0.8, 'QL-KTDL', 'Cần phối hợp với bộ phận vận hành camera.'),
('QL-KTDL-005', 'Quản trị, vận hành hệ thống Dashboard giám sát IOC (Kiểm tra tình trạng hoạt động dashboard, cảnh báo (uptime, lỗi hiển thị); theo dõi log hệ thống, xử lý sự cố phát sinh (nếu có))', 'Nhật ký hoạt động - Thường xuyên', 'N2', 5.4, 1.1, 'QL-KTDL', 'Cần phối hợp với các đơn vị cung cấp dữ liệu.'),
('QL-KTDL-006', 'Tạo và phân quyền tài khoản SSO', 'Nhật ký hoạt động - Thường xuyên', 'N3', 5.4, 1.1, 'QL-KTDL', null),
('QL-KTDL-007', 'QLVH- CALLBOT, CHATBOT, KGLVS -Kiểm tra tình trạng hoạt động dashboard, cảnh báo (uptime, lỗi hiển thị); theo dõi log hệ thống, xử lý sự cố phát sinh (nếu có)', 'Nhật ký hoạt động - Thường xuyên', 'N2', 5.4, 1.1, 'QL-KTDL', null),
('QL-KTDL-008', 'Bảo đảm kết nối, liên thông, chia sẻ dữ liệu giữa Hệ thống Quản lý văn bản và Điều hành của tỉnh với Hệ thống thông tin giải quyết TTHC tập trung cấp bộ theo quy định', 'Nhật ký hoạt động - Thường xuyên', 'N3', 6.0, 1.2, 'QL-KTDL', 'Cần đảm bảo an toàn, bảo mật dữ liệu.'),
('QL-KTDL-009', 'Kết nối, tích hợp chia sẻ dữ liệu với Kho dữ liệu dùng chung SCP', '- Thu thập dữ liệu (Khảo sát dữ liệu hiện có, phân loại dữ liệu, chuẩn hóa cấu trúc dữ liệu, rà soát chất lượng dữ liệu, xác định dữ liệu được chia sẻ);
- Đảm bảo an toàn thông tin dữ liệu;
- Chia sẻ dữ liệu (Thiết kế phương thức chia sẻ dữ liệu, đồng bộ dữ liệu);', 'N3', 11.0, 2.2, 'QL-KTDL', 'Cần đảm bảo an toàn, bảo mật dữ liệu.'),
('QL-KTDL-010', 'Liên hệ đầu mối từng Sở, ngành để cấu hình theo tài liệu tích hợp hướng dẫn (47 dịch vụ)', 'Theo công văn phối hợp', 'N2', 4.4, 0.9, 'QL-KTDL', 'Cần đảm bảo an toàn, bảo mật dữ liệu.'),
('QL-KTDL-011', 'Khắc phục lỗi trong việc gửi nhận văn bản trên Hệ thống Quản lý văn bản và điều hành (ks)', 'Báo cáo khắc phục lỗi gửi nhận văn bản', 'N2', 4.0, 0.8, 'QL-KTDL', 'Cần lưu lại log xử lý lỗi.'),
('QL-KTDL-012', 'Xây dựng lịch trực cơ quan', 'Lịch trực cơ quan, báo cáo phân công trực', 'N1', 3.2, 0.6, 'QL-KTDL', 'Cần đảm bảo lịch trực hợp lý, minh bạch.'),
('QL-KTDL-013', 'Báo cáo tháng PAHT', 'Báo cáo tổng hợp tháng PAHT', 'N1', 3.2, 0.6, 'QL-KTDL', 'Cần đảm bảo số liệu chính xác.'),
('QL-KTDL-014', 'Quản trị các website', 'Hỗ trợ quản trị và vận hành website - Thường xuyên;
Nhật ký hoạt động - Thường xuyên;
Backup database - theo tuần;
Backup source - Theo tháng;', 'N3', 4.0, 0.8, 'QL-KTDL', 'Cần đảm bảo an toàn, bảo mật website.'),
('QL-KTDL-015', 'V/v lấy ý kiến dự thảo Quyết định ban hành Quy chế quản lý, vận hành, sử dụng và khai thác Hệ thống thông tin báo cáo tỉnh Đắk Lắk (ks)', 'Công văn lấy ý kiến dự thảo Quy chế', 'N1', 3.2, 0.6, 'QL-KTDL', 'Cần đảm bảo tổng hợp đầy đủ ý kiến.'),
('QL-KTDL-016', 'Thiết lập tài khoản Hệ thống thư điện tử công vụ của tỉnh cho các đơn vị', 'Báo cáo thiết lập tài khoản thư điện tử', 'N2', 2.7, 0.5, 'QL-KTDL', 'Cần đảm bảo bảo mật thông tin tài khoản.'),
('QL-KTDL-017', 'Nâng cấp, hoàn thiện ứng dụng Đắk Lắk số', 'Báo cáo nâng cấp, hoàn thiện ứng dụng Đắk Lắk số', 'N3', 11.0, 2.2, 'QL-KTDL', 'Cần phối hợp với các đơn vị phát triển phần mềm.'),
('QL-KTDL-018', 'Quy chế phối hợp quản lý, khai thác, vận hành và sử dụng các dịch vụ Giám sát, điều hành đô thị thông minh tỉnh Đắk Lắk', 'Báo cáo phân công vận hành dịch vụ đô thị thông minh', 'N2', 3.6, 0.7, 'QL-KTDL', 'Cần đảm bảo phân công rõ ràng, minh bạch.'),
('QL-KTDL-019', 'Hồ sơ đề xuất cấp độ an toàn thông tin hệ thống Thư điện tử công vụ', 'Hồ sơ đề xuất cấp độ an toàn thông tin', 'N2', 3.6, 0.7, 'QL-KTDL', 'Cần đảm bảo hồ sơ đầy đủ, chính xác.'),
('QL-KTDL-020', 'Theo dõi , giám sát việc sử dụng hệ thống QLVB iOffice của VNPT', 'Báo cáo chuyển đổi sử dụng QLVB iOffice', 'N2', 6.0, 1.2, 'QL-KTDL', 'Cần đảm bảo dữ liệu chuyển đổi an toàn.'),
('QL-KTDL-021', 'Xây dựng kịch bản Callbot, Chatbot', 'Kịch bản', 'N2', 16.0, 3.2, 'QL-KTDL', null),
('QL-KTDL-022', 'Xây dựng phần mềm Website IOC mới', 'Website', 'N3', 200.0, 40.0, 'QL-KTDL', null),
('QL-KTDL-023', 'Hướng dẫn công việc', 'Báo cáo hướng dẫn công việc', 'N1', 1.0, 0.2, 'QL-KTDL', 'Cần đảm bảo người dùng nắm vững quy trình.'),
('QL-KTDL-024', 'Công khai đầu mối quản lý, vận hành và dữ liệu quan trắc nước thải tự động, liên tục theo thời gian thực trên trang thông tin điện tử của các KCN phía Đông tỉnh', 'Báo cáo công khai đầu mối, dữ liệu quan trắc', 'N1', 3.0, 0.6, 'QL-KTDL', 'Cần đảm bảo tính chính xác, minh bạch thông tin.'),
('QL-KTDL-025', 'Thay thông tin tài khoản quản trị hệ thống phần mềm iDesk', 'Báo cáo thay đổi thông tin tài khoản quản trị', 'N1', 1.8, 0.4, 'QL-KTDL', 'Cần đảm bảo bảo mật thông tin tài khoản.'),
('QL-KTDL-026', 'Liên hệ SNN&MT cung cấp file bản đồ KH sử dụng đất đến 2030 cập nhật Đắk Lắk Số', 'Báo cáo liên hệ cung cấp file bản đồ', 'N1', 3.0, 0.6, 'QL-KTDL', 'Cần đảm bảo thông tin chính xác.'),
('QL-KTDL-027', 'Kiểm thử chức năng sau nâng cấp phần mềm, ứng dụng, dashboard dùng chung của tỉnh', 'Biên bản kiểm thử, báo cáo kết quả vận hành sau nâng cấp', 'N2', 6.0, 1.2, 'QL-KTDL', 'Cần phối hợp với đơn vị phát triển phần mềm và đầu mối sử dụng.'),
('QL-KTDL-028', 'Xây dựng tài liệu hướng dẫn sử dụng, quy trình thao tác chuẩn cho các hệ thống dùng chung', 'Tài liệu hướng dẫn, quy trình thao tác chuẩn', 'N2', 6.0, 1.2, 'QL-KTDL', 'Cần trình bày rõ ràng, dễ áp dụng cho các đơn vị sử dụng.'),
('QL-KTDL-029', 'Tổng hợp kiến nghị từ các đơn vị sử dụng để đề xuất nâng cấp chức năng phần mềm, ứng dụng, dashboard', 'Báo cáo tổng hợp kiến nghị, đề xuất nâng cấp chức năng', 'N2', 6.0, 1.2, 'QL-KTDL', 'Cần phân loại kiến nghị theo mức độ ưu tiên và phạm vi ảnh hưởng.'),
('QL-KTDL-030', 'Tập huấn, hỗ trợ đầu mối các đơn vị khai thác, sử dụng các hệ thống phần mềm', 'Báo cáo tập huấn, danh sách hỗ trợ đơn vị', 'N2', 7.2, 1.4, 'QL-KTDL', 'Cần ghi nhận đầy đủ nội dung hướng dẫn và kết quả hỗ trợ.'),
('HT-NTS-001', 'Quản trị và giám sát trạng thái hoạt động của các dịch vụ nền tảng cốt lõi (SS, Domain, SSL, DNS,QRCODE)', 'Báo cáo trạng thái dịch vụ, nhật ký giám sát', 'N3', 4.0, 0.8, 'HT-NTS', null),
('HT-NTS-002', 'Quản trị tài khoản ủy quyền về ký số, hỗ trợ các đơn vị có nhu cầu liên quan đến ký số', 'Tài khoản ký số được cấp phát, hỗ trợ kỹ thuật', 'N2', 3.6, 0.7, 'HT-NTS', 'Đảm bảo bảo mật, đúng quy trình cấp phát.'),
('HT-NTS-003', 'Kiểm tra hiệu năng (CPU/RAM/Nhiệt độ) của hệ thống Core Switch, Router và SpineLeaf', 'Báo cáo hiệu năng thiết bị mạng', 'N3', 4.0, 0.8, 'HT-NTS', 'Cần lưu lại log kiểm tra để đối chiếu khi có sự cố.'),
('HT-NTS-004', 'Giám sát lưu lượng, băng thông các đường truyền Leased Line và mạng số liệu chuyên dùng cấp 1, 2', 'Báo cáo lưu lượng, cảnh báo băng thông', 'N3', 4.0, 0.8, 'HT-NTS', 'Cần phối hợp với nhà cung cấp dịch vụ khi có sự cố.'),
('HT-NTS-005', 'Kiểm tra tài nguyên (CPU, RAM, Storage) của các Node/Host và hệ thống lưu trữ trung tâm (SAN/NetApp/NAT)', 'Báo cáo tài nguyên hệ thống', 'N3', 4.0, 0.8, 'HT-NTS', 'Cần lưu lại log kiểm tra để phục vụ truy vết.'),
('HT-NTS-006', 'Rà soát nhật ký (Log) giám sát an toàn thông tin (SOC/Splunk) để phát hiện các dấu hiệu tấn công hoặc truy cập bất thường từ bên ngoài', 'Báo cáo phát hiện bất thường an toàn thông tin', 'N3', 4.4, 0.9, 'HT-NTS', 'Cần tuân thủ quy trình bảo mật, lưu trữ log.'),
('HT-NTS-007', 'Kiểm tra kết quả thực hiện các Job sao lưu dữ liệu tự động (Backup) định kỳ từ đêm trước; Kiểm tra dung lượng và tính toàn vẹn của các phân vùng lưu trữ bản backup', 'Báo cáo trạng thái backup, xác nhận tính toàn vẹn dữ liệu', 'N3', 4.0, 0.8, 'HT-NTS', 'Cần kiểm tra định kỳ, lưu lại báo cáo xác nhận.'),
('HT-NTS-008', 'Kiểm tra môi trường phòng máy', 'Báo cáo trạng thái môi trường phòng máy', 'N2', 1.8, 0.4, 'HT-NTS', 'Cần ghi nhận các chỉ số môi trường để đối chiếu khi có sự cố.'),
('HT-NTS-009', 'Rà soát trạng thái an toàn mạng RAID của các phân vùng lưu trữ, kịp thời phát hiện ổ đĩa lỗi/degraded', 'Báo cáo trạng thái RAID, cảnh báo lỗi ổ đĩa', 'N3', 4.0, 0.8, 'HT-NTS', 'Cần xử lý kịp thời để tránh mất dữ liệu.'),
('HT-NTS-010', 'Kiểm tra hệ thống cảnh báo sớm (Vertiv) và an toàn PCCC', 'Báo cáo trạng thái hệ thống cảnh báo, an toàn PCCC', 'N2', 3.6, 0.7, 'HT-NTS', 'Cần đảm bảo hệ thống luôn hoạt động tốt.'),
('HT-NTS-011', 'Kiểm tra theo dõi các tình trạng website (Cổng tỉnh, Camera UBTU, Xổ số kiến thiết Phú Yên, Bệnh viện Phục hồi chức năng....)', 'Báo cáo trạng thái website, cảnh báo sự cố', 'N2', 3.6, 0.7, 'HT-NTS', 'Cần phối hợp với quản trị viên website.'),
('HT-NTS-012', 'Quản trị và theo dõi hệ thống CCTV phòng máy máy chủ, hệ thống Access Control', 'Báo cáo trạng thái hệ thống CCTV, Access Control', 'N3', 4.0, 0.8, 'HT-NTS', 'Cần đảm bảo an ninh phòng máy.'),
('HT-NTS-013', 'Quản trị, vận hành, kiểm tra trạng thái sức khỏe tổng thể cụm ảo hóa/siêu hội tụ (Nutanix/HyperV/VMware vSphere/ProXmox)', 'Báo cáo trạng thái cụm ảo hóa/siêu hội tụ', 'N3', 4.4, 0.9, 'HT-NTS', 'Cần lưu lại log kiểm tra để phục vụ truy vết.'),
('HT-NTS-014', 'Kiểm tra vật lý bề mặt các tủ Rack, trạng thái đèn tín hiệu (LED) của các thiết bị phần cứng', 'Báo cáo trạng thái vật lý thiết bị', 'N1', 1.2, 0.2, 'HT-NTS', 'Cần kiểm tra định kỳ để phát hiện sớm lỗi phần cứng.'),
('HT-NTS-015', 'Vận hành, phối hợp xử lý và kiểm tra trạng thái hoạt động và tải của hệ thống nguồn điện UPS, máy phát điện dự phòng', 'Báo cáo trạng thái nguồn điện, cảnh báo sự cố', 'N3', 2.0, 0.4, 'HT-NTS', 'Cần đảm bảo nguồn điện liên tục cho hệ thống.'),
('HT-NTS-016', 'Quản trị trang thông tin điện tử QR-Code và khởi tạo tài khoản khi có yêu cầu', 'Báo cáo hoạt động trang', 'N2', 2.7, 0.5, 'HT-NTS', null),
('HT-NTS-017', 'Quản trị trang thông tin điện tử của IOC DAKLAK', 'Dữ liệu từ các hệ thống thông tin cơ sở được kết nối, đồng bộ liên tục và hiển thị chính xác', 'N3', 4.0, 0.8, 'HT-NTS', null),
('HT-NTS-018', 'Quản trị và cấp phát tài nguyên trên hệ thống Cpanel', 'Báo cáo hoạt động hệ thống', 'N2', 3.6, 0.7, 'HT-NTS', null),
('HT-NTS-019', 'Quản trị hệ thống email, hỗ trợ các đơn vị có nhu cầu khởi tạo email', 'Tài khoản ký email được cấp phát, hỗ trợ kỹ thuật', 'N2', 2.7, 0.5, 'HT-NTS', 'Đảm bảo bảo mật, đúng quy trình cấp phát.'),
('HT-NTS-020', 'Báo cáo kết nối, chia sẻ dữ liệu thực hiện theo Thông báo số 101/TB-VPUBND (thứ 5 hàng tuần)', 'Báo cáo kết nối, chia sẻ dữ liệu định kỳ', 'N2', 6.0, 1.2, 'HT-NTS', 'Cần đảm bảo số liệu chính xác.'),
('HT-NTS-021', 'LGSP - QLVH-Kiểm tra tình trạng hoạt động dashboard, cảnh báo (uptime, lỗi hiển thị); theo dõi log hệ thống, xử lý sự cố phát sinh (nếu có)', 'Nhật ký hoạt động- Thường xuyên', 'N3', 10.0, 2.0, 'HT-NTS', 'Cần lưu lại log kiểm tra để phục vụ truy vết.'),
('HT-NTS-022', 'Quy chế sử dụng và vận hành nền tảng tích hợp và chia sẻ dữ liệu cấp tỉnh (LGSP)', 'Báo cáo phân công sử dụng, vận hành LGSP', 'N2', 3.6, 0.7, 'HT-NTS', 'Cần đảm bảo phân công rõ ràng, minh bạch.'),
('HT-NTS-023', 'Báo cáo định kỳ kết nối LGSP', 'Báo cáo định kỳ kết nối LGSP', 'N2', 3.6, 0.7, 'HT-NTS', 'Cần đảm bảo số liệu chính xác.'),
('HT-NTS-024', 'Triển khai IPV6 cho DC 28 Y Bih Aleo', 'Báo cáo triển khai IPV6, cấu hình hệ thống', 'N3', 6.6, 1.3, 'HT-NTS', 'Cần phối hợp với nhà cung cấp dịch vụ mạng.'),
('HT-NTS-025', 'Thay thế ổ cứng (NAS HPE1650; SAN HPEMSA2025); thay thế ổ cứng và cài đặt lại OS cho Switch Core Dell S5048FON', 'Báo cáo thay thế, cấu hình thiết bị', 'N2', 2.0, 0.4, 'HT-NTS', 'Cần sao lưu dữ liệu trước khi thay thế.'),
('HT-NTS-026', 'Triển khai các nhiệm vụ trên hệ thống DC, tại 08 Lý Thái Tổ, như: bảo trì các hệ thống phụ trợ; bảo trì Máy chủ Dell, cài agent của SIEM trên các máy ảo; Thay thế ổ cứng (NAS HPE1650; SAN HPEMSA2025); thay thế ổ cứng và cài đặt lại OS cho Switch Core Dell S5048FON', 'Báo cáo tổng hợp bảo trì, triển khai hệ thống', 'N3', 7.2, 1.4, 'HT-NTS', 'Cần phối hợp nhiều bộ phận, đảm bảo an toàn dữ liệu.'),
('HT-NTS-027', 'Kiểm tra thử nghiệm phương án phục hồi dữ liệu sau sự cố đối với các hệ thống dùng chung', 'Biên bản thử nghiệm phục hồi, báo cáo kết quả', 'N3', 6.9, 1.4, 'HT-NTS', 'Cần phối hợp các đơn vị liên quan để bảo đảm an toàn dữ liệu.'),
('HT-NTS-028', 'Phối hợp triển khai, hoàn thiện hồ sơ cấp độ an toàn thông tin cho các hệ thống hạ tầng kỹ thuật', 'Hồ sơ cấp độ an toàn thông tin, báo cáo phối hợp', 'N3', 7.2, 1.4, 'HT-NTS', 'Cần tổng hợp đầy đủ thành phần hồ sơ theo quy định.'),
('HT-NTS-029', 'Xây dựng, cập nhật kế hoạch bảo trì định kỳ Trung tâm dữ liệu và các hệ thống phụ trợ', 'Kế hoạch bảo trì định kỳ, lịch triển khai bảo trì', 'N2', 3.8, 0.8, 'HT-NTS', 'Cần bám hiện trạng thiết bị và lịch vận hành thực tế.'),
('HT-NTS-030', 'Theo dõi thời hạn sử dụng tên miền, SSL, bản quyền phần mềm hạ tầng và tham mưu gia hạn', 'Báo cáo theo dõi thời hạn, đề xuất gia hạn', 'N2', 2.4, 0.5, 'HT-NTS', 'Cần theo dõi mốc thời gian để tránh gián đoạn dịch vụ.')
on conflict (code) do nothing;

-- Bổ sung từ sheet "DM 2 IOC & DC" (HT-NTS = DC, QL-KTDL = IOC): chỉ các sản phẩm CHƯA có trong danh mục theo tên
insert into public.kpi_catalog (code, name, output, grp, points, coef, dept, note) values
('HT-NTS-031', 'Cài agent của SIEM trên các máy ảo', 'Báo cáo cài đặt agent SIEM', 'N3', 1.0, 0.2, 'HT-NTS', 'Cần kiểm tra tương thích phần mềm.'),
('HT-NTS-032', 'V/v đề nghị khôi phục Thiết bị lưu khóa bí mật', 'Công văn đề nghị khôi phục thiết bị', 'N1', 1.6, 0.3, 'HT-NTS', 'Cần đảm bảo bảo mật thông tin.'),
('HT-NTS-033', 'V/v đề nghị thay đổi nội dung thông tin chứng thư chữ ký số chuyên dùng công vụ', 'Công văn đề nghị thay đổi thông tin chứng thư', 'N1', 1.6, 0.3, 'HT-NTS', 'Cần đảm bảo thông tin chính xác.'),
('HT-NTS-034', 'V/v đề nghị thu hồi tên miền congbaov1.daklak.gov.vn', 'Công văn đề nghị thu hồi tên miền', 'N1', 1.6, 0.3, 'HT-NTS', 'Cần đảm bảo thông tin chính xác.'),
('HT-NTS-035', 'V/v tham gia VNNIC INTERNET CONFERENCE 2026', 'Công văn đăng ký tham gia hội nghị', 'N1', 1.4, 0.3, 'HT-NTS', 'Cần đảm bảo thông tin đăng ký chính xác.'),
('QL-KTDL-031', 'Tích hợp phần mềm camera VMS vào LGSP để hiển thị trên Dashboard giám sát, điều hành', 'Báo cáo tích hợp phần mềm camera VMS', 'N3', 4.4, 0.9, 'QL-KTDL', 'Cần phối hợp với đơn vị cung cấp phần mềm.'),
('QL-KTDL-032', 'Kiểm tra tình trạng hoạt động dashboard, cảnh báo (uptime, lỗi hiển thị); theo dõi log hệ thống, xử lý sự cố phát sinh (nếu có)', 'Báo cáo trạng thái dashboard, log hệ thống', 'N3', 1.0, 0.2, 'QL-KTDL', 'Cần lưu lại log kiểm tra để phục vụ truy vết.'),
('QL-KTDL-033', 'Rà soát chức năng phần mềm phân hệ quy hoạch tích hợp Đắk Lắk Số và Cổng Tương tác công dân', 'Báo cáo rà soát chức năng phần mềm', 'N3', 4.0, 0.8, 'QL-KTDL', 'Cần phối hợp với đơn vị phát triển phần mềm.'),
('QL-KTDL-034', 'Báo cáo hiện trạng thông số hệ thống lưu trữ Camera an ninh, giám sát, TrafficID', 'Báo cáo hiện trạng hệ thống lưu trữ camera', 'N3', 4.0, 0.8, 'QL-KTDL', 'Cần phối hợp với bộ phận vận hành camera.'),
('QL-KTDL-035', 'Đôn đốc chuẩn hóa số liệu giám sát Dịch vụ công trên dashboard giám sát IOC sau khi hoàn thiện kết nối dữ liệu từ Cổng DVC Quốc gia và Bộ, ngành', 'Báo cáo chuẩn hóa số liệu giám sát DVC', 'N2', 5.4, 1.1, 'QL-KTDL', 'Cần phối hợp với các đơn vị cung cấp dữ liệu.'),
('QL-KTDL-036', 'Thực hiện cấu hình trục tích hợp liên thông theo sự chỉ đạo trực tiếp từ Sở Khoa học và Công nghệ; bảo đảm tiến độ tích hợp các hệ thống và phần mềm mới phục vụ dự án xây dựng hạ tầng chuyển đổi số tỉnh Đắk Lắk giai đoạn 2021-2025 định hướng đến năm 2030', 'Báo cáo cấu hình trục tích hợp liên thông', 'N3', 12.0, 2.4, 'QL-KTDL', 'Cần phối hợp với nhiều đơn vị kỹ thuật.'),
('QL-KTDL-037', 'Phê bình, kiểm điểm các địa phương chậm thực hiện Kế hoạch số 113/KH-UBND ngày 10/4/2026 của UBND tỉnh', 'Báo cáo phê bình, kiểm điểm', 'N1', 3.2, 0.6, 'QL-KTDL', 'Cần đảm bảo tính khách quan, chính xác.'),
('QL-KTDL-038', 'Báo cáo QLVH các hệ thống', 'Báo cáo quản lý vận hành hệ thống', 'N2', 3.6, 0.7, 'QL-KTDL', 'Cần đảm bảo số liệu chính xác.'),
('QL-KTDL-039', 'Báo cáo định kỳ kết nối LGSP', 'Báo cáo định kỳ kết nối LGSP', 'N2', 3.6, 0.7, 'QL-KTDL', 'Cần đảm bảo số liệu chính xác.'),
('QL-KTDL-040', 'Cấp quyền khai thác liên thông hộ tịch để tỉnh Đắk Lắk thực hiện kết nối, khai thác sử dụng dữ liệu hộ tịch thay thế giấy tờ trong giải quyết TTHC', 'Báo cáo cấp quyền khai thác liên thông hộ tịch', 'N3', 2.0, 0.4, 'QL-KTDL', 'Cần đảm bảo an toàn, bảo mật dữ liệu.'),
('QL-KTDL-041', 'Kết nối bốc số trực tuyến xã Ô Loan vào Đắk Lắk số', 'Báo cáo kết nối bốc số trực tuyến', 'N3', 4.0, 0.8, 'QL-KTDL', 'Cần phối hợp với đơn vị cung cấp hệ thống.'),
('QL-KTDL-042', 'Hoàn thiện phương án thu thập, tổng hợp, phân tích dữ liệu Y tế để hiển thị lên dashboard giám sát IOC', 'Báo cáo tổng hợp, phân tích dữ liệu Y tế', 'N3', 6.6, 1.3, 'QL-KTDL', 'Cần phối hợp với đơn vị cung cấp dữ liệu.'),
('QL-KTDL-043', 'Tiếp tục phối hợp thực hiện chuyển đổi kết nối Trục liên thông văn bản điện tử tỉnh Đắk Lắk', 'Báo cáo chuyển đổi kết nối trục liên thông', 'N3', 6.6, 1.3, 'QL-KTDL', 'Cần phối hợp với các đơn vị kỹ thuật.'),
('QL-KTDL-044', 'Kiện toàn Tổ xử lý phản ánh, kiến nghị của tổ chức, cá nhân qua dịch vụ Phản ánh hiện trường xã Ea H''Leo', 'Báo cáo kiện toàn tổ xử lý phản ánh', 'N2', 3.6, 0.7, 'QL-KTDL', 'Cần đảm bảo thông tin chính xác, minh bạch.'),
('QL-KTDL-045', 'Tập huấn hướng dẫn sử dụng phần mềm IDesk', 'Báo cáo tập huấn sử dụng phần mềm', 'N1', 1.6, 0.3, 'QL-KTDL', 'Cần đảm bảo người dùng nắm vững quy trình sử dụng.'),
('QL-KTDL-046', 'Thực hiện khảo sát hiện trạng, tình trạng kỹ thuật của các hệ thống camera giám sát đã được các đơn vị, địa phương đầu tư', 'Báo cáo khảo sát hệ thống camera', 'N3', 6.0, 1.2, 'QL-KTDL', 'Cần phối hợp với các đơn vị vận hành camera.'),
('QL-KTDL-047', 'Bàn giao nhiệm vụ quản lý vận hành HT Camera', 'Biên bản bàn giao nhiệm vụ quản lý vận hành', 'N1', 1.6, 0.3, 'QL-KTDL', 'Cần đảm bảo bàn giao đầy đủ, rõ ràng.'),
('QL-KTDL-048', 'Bổ sung nội dung trên APP Đắk Lắk số: Tiếp nhận ý kiến cử tri', 'Báo cáo bổ sung nội dung APP', 'N3', 4.0, 0.8, 'QL-KTDL', 'Cần đảm bảo nội dung chính xác, phù hợp.'),
('QL-KTDL-049', 'Đặt lịch và lấy số thứ tự làm TTHC trực tuyến của UBND xã Cư Pui lên ứng dụng Đắk Lắk số', 'Báo cáo tích hợp chức năng đặt lịch, lấy số thứ tự', 'N3', 4.0, 0.8, 'QL-KTDL', 'Cần phối hợp với đơn vị cung cấp hệ thống.'),
('QL-KTDL-050', 'Dự thảo quy chế và quy trình vận hành, khai thác hệ thống Camera an ninh', 'Dự thảo quy chế, quy trình vận hành Camera an ninh', 'N2', 9.0, 1.8, 'QL-KTDL', 'Cần đảm bảo quy chế phù hợp thực tiễn.'),
('QL-KTDL-051', 'Tập huấn Chuyển đổi số xã Dray Bhăng năm 2026 (lớp dành cho Tổ công nghệ số cộng đồng)', 'Báo cáo tập huấn chuyển đổi số', 'N2', 3.6, 0.7, 'QL-KTDL', 'Cần đảm bảo nội dung đào tạo phù hợp.'),
('QL-KTDL-052', 'Dự thảo quy chế và quy trình vận hành, khai thác hệ thống giám sát báo chí, mạng xã hội (Reputa)', 'Dự thảo quy chế, quy trình vận hành hệ thống Reputa', 'N2', 9.0, 1.8, 'QL-KTDL', 'Cần đảm bảo quy chế phù hợp thực tiễn.'),
('QL-KTDL-053', 'Báo cáo kết nối, chia sẻ dữ liệu thực hiện theo Thông báo số 101/TB-VPUBND (thứ 5 hàng tuần)', 'Báo cáo kết nối, chia sẻ dữ liệu định kỳ', 'N2', 3.6, 0.7, 'QL-KTDL', 'Cần đảm bảo số liệu chính xác.'),
('QL-KTDL-054', 'Chủ trì, phối hợp với các đơn vị liên quan tiếp tục tham mưu triển khai nâng cấp, hoàn thiện ứng dụng Đắk Lắk số; tập trung rà soát, bổ sung các tính năng thiết yếu, cải thiện trải nghiệm người dùng, nâng cao chất lượng cung cấp dịch vụ, đáp ứng tốt hơn nhu cầu của người dân và doanh nghiệp (Theo Thông báo số 70/TB-SKHCN ngày 03/4/2026)', 'Báo cáo nâng cấp, hoàn thiện ứng dụng Đắk Lắk số', 'N3', 11.0, 2.2, 'QL-KTDL', 'Cần phối hợp với các đơn vị phát triển phần mềm.'),
('QL-KTDL-055', 'Thực hiện phân công cho các thành viên Quy chế sử dụng và vận hành nền tảng tích hợp và chia sẻ dữ liệu cấp tỉnh (LGSP)', 'Báo cáo phân công sử dụng, vận hành LGSP', 'N2', 3.6, 0.7, 'QL-KTDL', 'Cần đảm bảo phân công rõ ràng, minh bạch.'),
('QL-KTDL-056', 'Thực hiện phân công cho các thành viên Quy chế phối hợp quản lý, khai thác, vận hành và sử dụng các dịch vụ Giám sát, điều hành đô thị thông minh tỉnh Đắk Lắk', 'Báo cáo phân công vận hành dịch vụ đô thị thông minh', 'N2', 3.6, 0.7, 'QL-KTDL', 'Cần đảm bảo phân công rõ ràng, minh bạch.'),
('QL-KTDL-057', 'Rà soát dịch vụ phần mềm cụ thể để tập trung sâu chuyên môn', 'Báo cáo rà soát dịch vụ phần mềm', 'N3', 6.0, 1.2, 'QL-KTDL', 'Cần phối hợp với các bộ phận chuyên môn.'),
('QL-KTDL-058', 'Báo cáo hạ tầng hệ thống camera giám sát an ninh và giao thông', 'Báo cáo hạ tầng camera an ninh, giao thông', 'N3', 6.0, 1.2, 'QL-KTDL', 'Cần phối hợp với các đơn vị vận hành camera.'),
('QL-KTDL-059', 'Trình hồ sơ đề xuất cấp độ an toàn thông tin hệ thống Thư điện tử công vụ', 'Hồ sơ đề xuất cấp độ an toàn thông tin', 'N2', 3.6, 0.7, 'QL-KTDL', 'Cần đảm bảo hồ sơ đầy đủ, chính xác.'),
('QL-KTDL-060', 'Chuyển sang sử dụng hệ thống QLVB iOffice của VNPT', 'Báo cáo chuyển đổi sử dụng QLVB iOffice', 'N3', 6.0, 1.2, 'QL-KTDL', 'Cần đảm bảo dữ liệu chuyển đổi an toàn.')
on conflict (code) do nothing;

-- Áp dụng hệ số của DM 2 cho các sản phẩm trùng tên (đồng ý của Giám đốc)
update public.kpi_catalog set coef = 0.4, points = 2.0, grp = 'N3' where code = 'HT-NTS-001';
update public.kpi_catalog set coef = 0.4, points = 1.8, grp = 'N2' where code = 'HT-NTS-002';
update public.kpi_catalog set coef = 0.1, points = 0.5, grp = 'N3' where code = 'HT-NTS-003';
update public.kpi_catalog set coef = 0.1, points = 0.5, grp = 'N3' where code = 'HT-NTS-004';
update public.kpi_catalog set coef = 0.1, points = 0.7, grp = 'N3' where code = 'HT-NTS-005';
update public.kpi_catalog set coef = 0.2, points = 1.1, grp = 'N3' where code = 'HT-NTS-006';
update public.kpi_catalog set coef = 0.1, points = 0.7, grp = 'N3' where code = 'HT-NTS-007';
update public.kpi_catalog set coef = 0.1, points = 0.5, grp = 'N2' where code = 'HT-NTS-008';
update public.kpi_catalog set coef = 0.1, points = 0.5, grp = 'N3' where code = 'HT-NTS-009';
update public.kpi_catalog set coef = 0.1, points = 0.5, grp = 'N2' where code = 'HT-NTS-010';
update public.kpi_catalog set coef = 0.1, points = 0.5, grp = 'N2' where code = 'HT-NTS-011';
update public.kpi_catalog set coef = 0.1, points = 0.7, grp = 'N3' where code = 'HT-NTS-012';
update public.kpi_catalog set coef = 0.2, points = 1.1, grp = 'N3' where code = 'HT-NTS-013';
update public.kpi_catalog set coef = 0.1, points = 0.5, grp = 'N2' where code = 'HT-NTS-014';
update public.kpi_catalog set coef = 0.1, points = 0.7, grp = 'N3' where code = 'HT-NTS-015';
update public.kpi_catalog set coef = 1.9, points = 9.5, grp = 'N3' where code = 'HT-NTS-017';
update public.kpi_catalog set coef = 1.0, points = 5.0, grp = 'N2' where code = 'HT-NTS-018';
update public.kpi_catalog set coef = 0.9, points = 4.4, grp = 'N3' where code = 'HT-NTS-024';
update public.kpi_catalog set coef = 0.9, points = 4.4, grp = 'N3' where code = 'QL-KTDL-008';
update public.kpi_catalog set coef = 0.9, points = 4.4, grp = 'N3' where code = 'QL-KTDL-009';
update public.kpi_catalog set coef = 0.7, points = 3.6, grp = 'N2' where code = 'QL-KTDL-024';
update public.kpi_catalog set coef = 0.4, points = 1.8, grp = 'N2' where code = 'QL-KTDL-011';
update public.kpi_catalog set coef = 0.4, points = 1.8, grp = 'N2' where code = 'QL-KTDL-016';
update public.kpi_catalog set coef = 0.3, points = 1.6, grp = 'N1' where code = 'QL-KTDL-023';


-- ───────── 50-kpi-viec-ngoai-danh-muc.sql ─────────
-- ============================================================
--  50 — VIỆC NGOÀI DANH MỤC / ĐỘT XUẤT / ĐỊNH KỲ GẮN SẢN PHẨM CHUẨN
--  • tasks.catalog_group: nhóm N1–N5 chọn khi việc KHÔNG có trong danh mục (hệ số tạm theo nhóm, chờ Giám đốc đưa vào danh mục).
--  • tasks.adhoc: đánh dấu việc ĐỘT XUẤT.
--  • recurring_templates.catalog_code: mẫu việc định kỳ gắn sản phẩm chuẩn (mỗi lượt tính theo hệ số sản phẩm).
--  Chạy CẢ FILE trong Supabase > SQL Editor (sau file 49). Chạy lại nhiều lần vẫn an toàn.
-- ============================================================
alter table public.tasks add column if not exists catalog_group text;
alter table public.tasks add column if not exists adhoc boolean not null default false;
alter table public.recurring_templates add column if not exists catalog_code text;


-- ───────── 51-nhac-thu-dien-tu.sql ─────────
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


-- ───────── HOÀN THIỆN ─────────
-- Hàm nội bộ không cho gọi từ API (mục (2) của file 46)
revoke all on function public._verify_admin(text, text) from public, anon, authenticated;

-- Tắt RLS trên mọi bảng (ứng dụng đăng nhập bằng RPC riêng; quyền cột/hàm do GRANT/REVOKE ở trên bảo vệ)
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I disable row level security', r.tablename);
  end loop;
end $$;

-- Khóa máy chủ (service_role) cần toàn quyền để API gửi email đọc dữ liệu
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

notify pgrst, 'reload schema';
