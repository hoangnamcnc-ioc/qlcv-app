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
