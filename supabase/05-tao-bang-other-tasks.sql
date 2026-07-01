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
