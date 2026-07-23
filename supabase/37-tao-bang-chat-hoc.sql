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
