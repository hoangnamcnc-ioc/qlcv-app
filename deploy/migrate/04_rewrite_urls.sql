-- BƯỚC 4 — Đổi địa chỉ file đính kèm trong dữ liệu: trước đây trỏ vào https://<mã>.supabase.co/storage/..., nay phải trỏ vào tên miền mới.
-- Quét MỌI cột text/varchar/json/jsonb của schema public, thay địa chỉ cũ bằng mới. Chạy trên máy chủ:
--   docker exec -i qlcv-db psql -U postgres -d postgres \
--     -v old='https://<mã-dự-án>.supabase.co' -v new='https://qlcv.ten-mien.vn' < deploy/migrate/04_rewrite_urls.sql
-- Chạy lại nhiều lần an toàn.
select set_config('qlcv.old', :'old', false), set_config('qlcv.new', :'new', false);
do $$
declare
  r record; n bigint; total bigint := 0; v_type text;
  v_old text := current_setting('qlcv.old');
  v_new text := current_setting('qlcv.new');
begin
  if v_old = '' or v_new = '' or v_old = v_new then
    raise exception 'Cần truyền -v old=... -v new=... và hai giá trị phải khác nhau';
  end if;
  for r in
    select c.table_name as t, c.column_name as col, c.data_type as dt
      from information_schema.columns c
      join information_schema.tables tb
        on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
     where c.table_schema = 'public' and c.data_type in ('text', 'character varying', 'json', 'jsonb')
  loop
    v_type := case r.dt when 'jsonb' then 'jsonb' when 'json' then 'json' else 'text' end;
    execute format('update public.%I set %I = replace(%I::text, %L, %L)::%s where %I::text like %L',
                   r.t, r.col, r.col, v_old, v_new, v_type, r.col, '%' || v_old || '%');
    get diagnostics n = row_count;
    if n > 0 then
      raise notice '%.%: % dòng', r.t, r.col, n;
      total := total + n;
    end if;
  end loop;
  raise notice 'Tổng cộng đã sửa % ô dữ liệu', total;
end $$;
