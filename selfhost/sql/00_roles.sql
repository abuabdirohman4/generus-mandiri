-- PostgREST roles (Supabase-compatible), idempotent.
-- authenticator = login role PostgREST connects as, then switches to
-- anon / authenticated / service_role based on the JWT `role` claim.
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticator') then
    -- local dev only; PostgREST binds to 127.0.0.1
    create role authenticator login noinherit password 'postgrest_local_dev';
  end if;
end
$$;

grant anon to authenticator;
grant authenticated to authenticator;
grant service_role to authenticator;

-- Match Supabase Cloud per-role statement timeouts
alter role anon set statement_timeout = '3s';
alter role authenticated set statement_timeout = '8s';
alter role service_role set statement_timeout = '120s';

-- authenticator runs schema-cache introspection BEFORE impersonation (SET ROLE).
-- With statement_timeout=0 (unlimited), an expensive/hanging query (e.g. an
-- unfiltered meetings RLS scan) makes the schema cache never load -> PGRST002
-- -> every request 503s -> login fails. Give it a finite cap: normal
-- introspection is <2s, 15s leaves cold-start margin without allowing a hang.
-- Impersonated roles keep their own (tighter) timeouts, applied at SET ROLE.
alter role authenticator set statement_timeout = '15s';
