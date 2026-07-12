-- Supabase-compat shims: auth.* helper functions + extensions schema.
-- RLS policies dumped from Supabase call auth.uid()/auth.role()/auth.jwt();
-- these definitions match Supabase's, reading claims PostgREST puts in
-- request.jwt.claims.

create schema if not exists auth;
create schema if not exists extensions;

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function auth.jwt()
returns jsonb
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), ''),
    '{}'
  )::jsonb
$$;

create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

create or replace function auth.role()
returns text
language sql stable
as $$
  select coalesce(
    auth.jwt() ->> 'role',
    nullif(current_setting('role', true), 'none')
  )
$$;

create or replace function auth.email()
returns text
language sql stable
as $$
  select auth.jwt() ->> 'email'
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;
