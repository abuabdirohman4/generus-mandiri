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

$PSQL -d "$LOCAL_DB" -f sql/02_grants.sql

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
