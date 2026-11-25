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
