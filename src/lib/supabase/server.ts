import { createServerClient, type CookieOptions } from '@supabase/ssr'
import {
  createClient as createSupabaseJsClient,
  SupabaseClient,
} from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { stripRestPrefixFetch } from './restFetch'

function dataPostgrestUrl() {
  return (
    process.env.DATA_POSTGREST_URL ??
    process.env.NEXT_PUBLIC_DATA_POSTGREST_URL
  )
}

/**
 * Auth client — always points at Supabase Cloud (GoTrue), session from
 * request cookies. Use for auth.getUser()/getSession()/signOut etc.
 */
export async function createAuthClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Data client — all `.from()` / `.rpc()` calls in server actions.
 *
 * When DATA_POSTGREST_URL (or NEXT_PUBLIC_DATA_POSTGREST_URL) is set,
 * queries go to the self-hosted PostgREST with the current user's Supabase
 * access token attached (from the session cookie), so existing RLS policies
 * keep working. When unset, falls back to the Supabase Cloud client —
 * this is the cutover switch.
 */
export async function createClient(): Promise<SupabaseClient> {
  const dataUrl = dataPostgrestUrl()
  if (!dataUrl) return createAuthClient()

  const authClient = await createAuthClient()

  return createSupabaseJsClient(
    dataUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => {
        const { data } = await authClient.auth.getSession()
        return (
          data.session?.access_token ??
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
      },
      global: { fetch: stripRestPrefixFetch(dataUrl) },
    }
  )
}

/**
 * Admin DATA client — bypasses RLS (service_role) for cross-org queries.
 * Self-hosted PostgREST validates the service_role JWT with the same
 * Supabase secret; the local `service_role` PG role has BYPASSRLS.
 * For auth.admin.* (create/delete users) use createAdminAuthClient().
 */
export async function createAdminClient(): Promise<SupabaseClient> {
  const dataUrl = dataPostgrestUrl()
  if (!dataUrl) return createAdminAuthClient()

  return createSupabaseJsClient(
    dataUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: stripRestPrefixFetch(dataUrl) },
    }
  )
}

/**
 * Storage client — always points at Supabase Cloud Storage (not PostgREST).
 * Use for all .storage.from() operations (upload, signedUrl, delete).
 * Storage stays on Supabase Cloud even in self-hosted data plane mode.
 */
export function createStorageClient(): SupabaseClient {
  return createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

/**
 * Admin AUTH client — Supabase Cloud with service_role key, for
 * auth.admin.* operations (user creation/deletion). Auth stays on
 * Supabase Cloud in the hybrid architecture.
 */
export async function createAdminAuthClient(): Promise<SupabaseClient> {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get() {
          return undefined
        },
        set() {
          // No-op for admin client
        },
        remove() {
          // No-op for admin client
        },
      },
    }
  )
}
