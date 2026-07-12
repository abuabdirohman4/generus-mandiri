import { createBrowserClient } from '@supabase/ssr'
import { stripRestPrefixFetch } from './restFetch'
import {
  createClient as createSupabaseJsClient,
  SupabaseClient,
} from '@supabase/supabase-js'

let authClient: SupabaseClient | null = null
let dataClient: SupabaseClient | null = null

/**
 * Auth client — always points at Supabase Cloud (GoTrue + Realtime).
 * Use for: auth.* calls, realtime channels (presence).
 */
export function createAuthClient() {
  if (authClient) return authClient

  authClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return authClient
}

/**
 * Data client — all `.from()` / `.rpc()` calls.
 *
 * When NEXT_PUBLIC_DATA_POSTGREST_URL is set, queries go to the self-hosted
 * PostgREST with the current user's Supabase access token attached, so RLS
 * keeps working (PostgREST validates the token with the same JWT secret).
 * When unset, falls back to the Supabase Cloud client (legacy single-client
 * behavior) — this is the cutover switch.
 */
export function createClient() {
  const dataUrl = process.env.NEXT_PUBLIC_DATA_POSTGREST_URL
  if (!dataUrl) return createAuthClient()

  if (dataClient) return dataClient

  const auth = createAuthClient()
  dataClient = createSupabaseJsClient(
    dataUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => {
        const { data } = await auth.auth.getSession()
        return (
          data.session?.access_token ??
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
      },
      global: { fetch: stripRestPrefixFetch(dataUrl) },
    }
  )

  return dataClient
}
