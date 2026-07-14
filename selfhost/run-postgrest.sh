#!/usr/bin/env bash
# Run local PostgREST against the local data-plane DB.
# JWT secret = the Supabase project's JWT secret, so access tokens issued by
# Supabase Cloud Auth validate here and auth.uid()/RLS work unchanged.
set -euo pipefail

cd "$(dirname "$0")"
set -a
source .env.selfhost
set +a

: "${SUPABASE_JWT_SECRET:?SUPABASE_JWT_SECRET missing in selfhost/.env.selfhost}"

LOCAL_DB="${LOCAL_DB:-generus_local}"
LOCAL_PG_PORT="${LOCAL_PG_PORT:-5417}"
PORT="${POSTGREST_PORT:-3001}"

export PGRST_DB_URI="postgres://authenticator:postgrest_local_dev@localhost:$LOCAL_PG_PORT/$LOCAL_DB"
export PGRST_DB_SCHEMAS="public"
export PGRST_DB_ANON_ROLE="anon"

# GoTrue signs user access tokens with a `kid` header; PostgREST only matches
# keys by kid when one is present. Wrap the legacy HS256 secret as a JWK Set
# carrying that kid (SUPABASE_JWT_KID, from any user token header) plus a
# kid-less copy for legacy anon/service_role keys.
export PGRST_JWT_SECRET="$(python3 - <<PY
import base64, json, os
secret = os.environ['SUPABASE_JWT_SECRET']
k = base64.urlsafe_b64encode(secret.encode()).rstrip(b'=').decode()
keys = [{"kty": "oct", "alg": "HS256", "k": k}]
kid = os.environ.get('SUPABASE_JWT_KID')
if kid:
    keys.append({"kty": "oct", "alg": "HS256", "k": k, "kid": kid})
print(json.dumps({"keys": keys}))
PY
)"
export PGRST_SERVER_HOST="127.0.0.1"
export PGRST_SERVER_PORT="$PORT"
export PGRST_SERVER_CORS_ALLOWED_ORIGINS="http://localhost:3000"

# Refresh planner statistics before starting PostgREST. After a Postgres.app
# restart the stats catalog is empty, causing the planner to pick worst-case
# plans for RLS-heavy queries (e.g. profiles + meetings) -> 2-6s per request.
# VACUUM ANALYZE takes ~1-2s on the local DB and fixes this permanently.
/Applications/Postgres.app/Contents/Versions/17/bin/psql \
  -p "$LOCAL_PG_PORT" -d "$LOCAL_DB" -q -c "VACUUM ANALYZE;" 2>/dev/null \
  && echo "VACUUM ANALYZE done" || echo "VACUUM ANALYZE skipped (psql not found)"

echo "PostgREST -> http://127.0.0.1:$PORT (db: $LOCAL_DB)"
exec postgrest
