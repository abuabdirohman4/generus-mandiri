#!/usr/bin/env bash
# Recreate the local data-plane DB from dump/public_full.sql.
# Drops + recreates database $LOCAL_DB, applies role/auth shims, restores
# the dump (minus the profiles -> auth.users FK, which cannot hold locally
# because auth.users stays on Supabase Cloud), then applies grants.
set -euo pipefail

cd "$(dirname "$0")"

PGBIN="/Applications/Postgres.app/Contents/Versions/17/bin"
LOCAL_DB="${LOCAL_DB:-generus_local}"
LOCAL_PG_PORT="${LOCAL_PG_PORT:-5417}"
PSQL="$PGBIN/psql -p $LOCAL_PG_PORT -v ON_ERROR_STOP=1 -q"

[ -f dump/public_full.sql ] || { echo "dump/public_full.sql missing — run ./dump-supabase.sh first"; exit 1; }

# Strip FK constraints referencing auth.users (auth schema lives on Supabase
# Cloud; keeping the FK would break profile inserts for new signups).
python3 - <<'EOF'
import re
src = open('dump/public_full.sql').read()
filtered, n = re.subn(r'ALTER TABLE[^;]*REFERENCES auth\.users[^;]*;', '-- (removed: FK to auth.users, auth stays on Supabase Cloud)', src)
filtered = filtered.replace('CREATE SCHEMA public;', '-- (removed: public schema already exists)')
open('dump/public_full.filtered.sql', 'w').write(filtered)
print(f'Removed {n} FK statement(s) referencing auth.users')
EOF

$PSQL -d postgres -c "drop database if exists $LOCAL_DB"
$PSQL -d postgres -c "create database $LOCAL_DB"

$PSQL -d "$LOCAL_DB" -f sql/00_roles.sql
$PSQL -d "$LOCAL_DB" -f sql/01_auth_shim.sql
$PSQL -d "$LOCAL_DB" -f dump/public_full.filtered.sql
# Fresh planner statistics: without ANALYZE the catalog stats are empty and the
# planner can pick a catastrophic plan for expensive RLS policies (e.g. an
# unfiltered meetings scan), making PostgREST's schema-cache query hang -> 503.
$PGBIN/psql -p "$LOCAL_PG_PORT" -d "$LOCAL_DB" -q -c "VACUUM ANALYZE;"

# Drop triggers and functions that sync to auth.users (GoTrue only on Supabase Cloud;
# auth.users does not exist on self-hosted Postgres).
$PSQL -d "$LOCAL_DB" -c "DROP TRIGGER IF EXISTS sync_profile_email_to_auth_users ON public.profiles;"
$PSQL -d "$LOCAL_DB" -c "DROP FUNCTION IF EXISTS sync_profile_email_to_auth_users();"

$PSQL -d "$LOCAL_DB" -f sql/02_grants.sql


# Audit gate: fail loudly if any public object still references auth.* beyond
# the 4 shim functions (uid/role/jwt/email). These would blow up at runtime,
# not at restore time — exactly how sync_profile_email_to_auth_users was missed.
echo 'Auditing for residual auth.* references...'
AUDIT_RESULT=$($PGBIN/psql -p "$LOCAL_PG_PORT" -d "$LOCAL_DB" -tA -c "
  SELECT 'FUNCTION: ' || p.proname || ' references auth.*'
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosrc ILIKE '%auth.%'
    AND p.prosrc NOT ILIKE '%auth.uid%'
    AND p.prosrc NOT ILIKE '%auth.role%'
    AND p.prosrc NOT ILIKE '%auth.jwt%'
    AND p.prosrc NOT ILIKE '%auth.email%'
  UNION ALL
  SELECT 'POLICY: ' || tablename || '.' || policyname || ' references auth.users'
  FROM pg_policies
  WHERE (qual ILIKE '%auth.users%' OR with_check ILIKE '%auth.users%')
  UNION ALL
  SELECT 'VIEW: ' || table_name || ' references auth.*'
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND view_definition ILIKE '%auth.%'
    AND view_definition NOT ILIKE '%auth.uid%'
    AND view_definition NOT ILIKE '%auth.role%'
  UNION ALL
  SELECT 'FK: ' || tc.table_name || '.' || kcu.column_name || ' -> ' || ccu.table_schema || '.' || ccu.table_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_schema NOT IN ('public', 'extensions');
")
if [ -n "$AUDIT_RESULT" ]; then
  echo ""
  echo "ERROR: Residual auth.* references found — these will fail at runtime:"
  echo "$AUDIT_RESULT"
  echo ""
  echo "Fix: add DROP or patch to restore-local.sh before this gate, then re-run."
  exit 1
fi
echo 'Audit OK: no residual auth.* references.'

echo "OK: database $LOCAL_DB restored"
$PGBIN/psql -p "$LOCAL_PG_PORT" -d "$LOCAL_DB" -tAc "
  select 'tables: '    || count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'
  union all
  select 'policies: '  || count(*) from pg_policies where schemaname='public'
  union all
  select 'functions: ' || count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
  union all
  select 'rls tables: '|| count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relrowsecurity"
