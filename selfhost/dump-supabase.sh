#!/usr/bin/env bash
# Dump the Supabase `public` schema (DDL + data + RLS policies + functions
# + triggers) into selfhost/dump/public_full.sql.
#
# Requires SUPABASE_DB_URL in selfhost/.env.selfhost (see README).
# Uses Postgres.app's pg_dump 17 to match the Supabase server (PG 17.6).
set -euo pipefail

cd "$(dirname "$0")"
source .env.selfhost

PGBIN="/Applications/Postgres.app/Contents/Versions/17/bin"
mkdir -p dump

"$PGBIN/pg_dump" "$SUPABASE_DB_URL" \
  --schema=public \
  --no-owner \
  --no-privileges \
  --file=dump/public_full.sql

echo "OK: dump/public_full.sql ($(du -h dump/public_full.sql | cut -f1))"
