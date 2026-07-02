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
