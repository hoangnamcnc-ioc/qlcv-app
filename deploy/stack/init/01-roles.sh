#!/bin/bash
# Chạy MỘT LẦN khi CSDL được khởi tạo lần đầu (docker-entrypoint-initdb.d).
# Tạo các vai trò mà dữ liệu cũ (từ Supabase) đang dùng trong quyền truy cập, cùng vài hàm tương thích.
set -e
psql -v ON_ERROR_STOP=1 -v pw="$AUTHENTICATOR_PASSWORD" --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
-- Vai trò: anon (khóa công khai của giao diện), service_role (khóa của máy chủ API, bỏ qua RLS), authenticator (PostgREST đăng nhập rồi chuyển vai trò)
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator noinherit login password :'pw';
grant anon, authenticated, service_role to authenticator;

-- Schema/hàm tương thích: bản xuất từ Supabase có thể tham chiếu extensions.* hoặc auth.uid() (chính sách RLS cũ)
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create schema if not exists auth;
create or replace function auth.jwt() returns jsonb language sql stable as $f$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$f$;
create or replace function auth.uid() returns uuid language sql stable as $f$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$f$;
create or replace function auth.role() returns text language sql stable as $f$
  select auth.jwt() ->> 'role'
$f$;
grant usage on schema extensions, auth to anon, authenticated, service_role;
alter database postgres set search_path to "$user", public, extensions;
grant usage on schema public to anon, authenticated, service_role;
-- KHÔNG đặt 'default privileges' cho bảng mới: quyền từng bảng/cột (vd. users.password bị khóa) lấy đúng theo bản xuất, tránh vô tình mở rộng quyền.
SQL
