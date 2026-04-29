import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    // Skip middleware for static assets and PWA files
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/images/') ||
      pathname.startsWith('/icons/') ||
      pathname.startsWith('/audio/') ||
      pathname === '/favicon.ico' ||
      pathname === '/manifest.json' ||
      pathname === '/sw.js' ||
      pathname.startsWith('/workbox-')
    ) {
      return NextResponse.next()
    }

    // Skip middleware for API routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.next()
    }

    const { supabase, response } = createClient(request)
    
    // Get session with timeout to prevent hanging
    let session = null
    try {
      const { data: { session: sessionData } } = await supabase.auth.getSession()
      session = sessionData
    } catch (error) {
      console.error('Auth session error:', error)
      // Continue without session if auth fails
    }

    // Define route categories
    const publicRoutes = ['/signin', '/signup']
    const protectedRoutes = [
      '/home', 
      '/absensi',
      '/laporan',
      '/users/siswa',
      '/users/guru',
      '/users/admin',
      '/organisasi',
      '/kelas',
      '/settings',
      '/audit'
    ]
    
    const isPublicRoute = publicRoutes.includes(pathname)
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    
    // Handle root path redirect
    if (pathname === '/') {
      if (session) {
        return NextResponse.redirect(new URL('/home', request.url))
      } else {
        return NextResponse.redirect(new URL('/signin', request.url))
      }
    }
    
    // Redirect authenticated users away from auth pages
    if (session && isPublicRoute) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
    
    // Redirect unauthenticated users to signin
    if (!session && isProtectedRoute) {
      const signinUrl = new URL('/signin', request.url)
      signinUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(signinUrl)
    }

    // Page view tracking (fire-and-forget via service role)
    // Hanya log full page navigation — skip RSC data fetch dan prefetch
    const isRSCRequest = request.headers.get('rsc') === '1'
    const isPrefetch = request.headers.get('next-router-prefetch') === '1'
    if (session && isProtectedRoute && !isRSCRequest && !isPrefetch) {
      const userId = session.user.id
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (supabaseUrl && serviceRoleKey) {
        ;(async () => {
          try {
            // Fetch profile with service role (bypass RLS)
            const profileRes = await fetch(
              `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=role,daerah_id,desa_id,kelompok_id&limit=1`,
              {
                headers: {
                  apikey: serviceRoleKey,
                  Authorization: `Bearer ${serviceRoleKey}`,
                  'Content-Type': 'application/json',
                },
              }
            )
            const profiles = await profileRes.json()
            const profile = profiles?.[0]

            if (profile) {
              await fetch(`${supabaseUrl}/rest/v1/activity_logs`, {
                method: 'POST',
                headers: {
                  apikey: serviceRoleKey,
                  Authorization: `Bearer ${serviceRoleKey}`,
                  'Content-Type': 'application/json',
                  Prefer: 'return=minimal',
                },
                body: JSON.stringify({
                  user_id: userId,
                  user_role: profile.role,
                  org_daerah_id: profile.daerah_id ?? null,
                  org_desa_id: profile.desa_id ?? null,
                  org_kelompok_id: profile.kelompok_id ?? null,
                  action: 'open_page',
                  page_path: pathname,
                }),
              })
            }
          } catch {
            // Silent fail for logging
          }
        })()
      }
    }

    // Allow public routes and authenticated protected routes
    return response
  } catch (error) {
    console.error('Middleware error:', error)
    // On error, allow the request to continue
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images)
     * - manifest.json (PWA manifest)
     * - sw.js (service worker)
     * - sw-dev.js (development service worker)
     * - sw-custom.js (custom service worker)
     * - workbox-*.js (workbox files)
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|manifest\.json|sw\.js|sw-dev\.js|sw-custom\.js|workbox-).*)',
  ],
} 