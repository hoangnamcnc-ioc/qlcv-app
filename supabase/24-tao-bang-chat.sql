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
