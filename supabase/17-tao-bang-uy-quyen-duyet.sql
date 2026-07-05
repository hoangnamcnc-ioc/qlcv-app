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
