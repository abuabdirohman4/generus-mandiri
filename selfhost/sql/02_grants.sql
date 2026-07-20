-- Run AFTER restoring the public schema dump.
-- The dump is taken with --no-privileges, so Supabase's default grants are
-- absent; recreate them here. Security is enforced by RLS, not grants
-- (same model as Supabase).

grant usage on schema public to anon, authenticated, service_role;

-- authenticated + service_role: full DML. RLS scopes `authenticated`;
-- `service_role` has BYPASSRLS and is the deliberate privileged path.
grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- anon: READ ONLY, deliberately.
--
-- The "security is enforced by RLS, not grants" model above only holds while
-- every table actually has RLS enabled with correct policies. Three junction
-- tables still have RLS switched off entirely (teacher_classes, student_classes,
-- report_template_classes — beads sm-2bx / GH-#27), and several others carry
-- permissive `USING (true)` write policies. With `grant all`, table grants were
-- the ONLY thing between an anonymous PostgREST request and a DELETE of e.g. the
-- whole student-class map. The anon key is public (shipped in the browser
-- bundle), so it is not a barrier.
--
-- Keep this read-only until sm-2bx lands. Writes never legitimately run as anon:
-- the app has no signup flow (admins create users via service_role), and
-- logged-in users authenticate as `authenticated`.
grant select on all tables in schema public to anon;

alter default privileges in schema public
  grant all on tables to authenticated, service_role;
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant all on sequences to authenticated, service_role;
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
