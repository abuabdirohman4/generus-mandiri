/**
 * supabase-js hardcodes the `/rest/v1` path prefix (Supabase's Kong gateway
 * route). Plain self-hosted PostgREST serves at the root, so strip the
 * prefix here — keeps SupabaseClient types intact at all query call sites.
 */
export function stripRestPrefixFetch(dataUrl: string): typeof fetch {
  const base = dataUrl.replace(/\/$/, '')
  const prefix = `${base}/rest/v1`
  return (input, init) => {
    const url = input instanceof Request ? input.url : input.toString()
    if (url.startsWith(prefix)) {
      const stripped = base + url.slice(prefix.length)
      return fetch(
        input instanceof Request ? new Request(stripped, input) : stripped,
        init
      )
    }
    return fetch(input as RequestInfo, init)
  }
}
