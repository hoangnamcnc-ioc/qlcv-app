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
