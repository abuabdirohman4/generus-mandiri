-- Run AFTER restoring the public schema dump.
-- The dump is taken with --no-privileges, so Supabase's default grants are
-- absent; recreate them here. Security is enforced by RLS, not grants
-- (same model as Supabase).

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

-- PostgREST 14 builds its schema cache while still connected as the login
-- role (authenticator) BEFORE switching to anon. `information_schema.tables`
-- only lists tables the *current* role has a privilege on, so a privilege-less
-- noinherit authenticator sees zero tables -> schema cache fails (PGRST002) ->
-- every request 503s (incl. the login profiles lookup).
-- Grant authenticator read access so introspection succeeds. RLS still applies
-- once PostgREST switches to anon/authenticated per request; service_role
-- (BYPASSRLS) is the only privileged path. Safe for local dev (127.0.0.1-bound).
grant usage on schema public to authenticator;
grant select on all tables in schema public to authenticator;
alter default privileges in schema public
  grant select on tables to authenticator;
