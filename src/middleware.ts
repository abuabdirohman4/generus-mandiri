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
    const protectedRoutes = ['/home', '/absensi', '/teachers', '/settings', '/dashboard']
    
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