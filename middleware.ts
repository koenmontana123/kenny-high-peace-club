import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle secret gate paths - rewrite to hidden routes
  const adminGate = process.env.ADMIN_GATE_PATH || '/gate-a7k3f9'
  const superGate = process.env.SUPER_GATE_PATH || '/root-m9x2p4'

  // Normalize gate paths (remove quotes if present)
  const cleanAdminGate = adminGate.replace(/"/g, '').trim()
  const cleanSuperGate = superGate.replace(/"/g, '').trim()

  // Rewrite secret gates to internal routes
  if (pathname === cleanAdminGate || pathname === cleanAdminGate + '/') {
    return NextResponse.rewrite(new URL('/secret/admin-gate', request.url))
  }

  if (pathname === cleanSuperGate || pathname === cleanSuperGate + '/') {
    return NextResponse.rewrite(new URL('/secret/super-gate', request.url))
  }

  // Also allow direct access to secret routes for testing (but they should be hidden)
  // Keep _secret as alias for backwards compatibility
  if (pathname === '/_secret/admin-gate' || pathname === '/_secret/super-gate') {
    return NextResponse.rewrite(new URL(pathname.replace('_secret', 'secret'), request.url))
  }

  // Forced password change check is done server-side in layouts to avoid cookie parsing here
  // But we can do basic session check for redirect to login

  const sessionToken = request.cookies.get('session')?.value

  const publicPaths = ['/login', '/_secret/admin-gate', '/_secret/super-gate', '/api']
  const isPublicPath = publicPaths.some(p => pathname.startsWith(p))

  // If no session and not public path, redirect to login
  if (!sessionToken && !isPublicPath && pathname !== '/') {
    if (pathname.startsWith('/super')) {
      return NextResponse.redirect(new URL(cleanSuperGate, request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If session exists and user is at root, redirect to dashboard
  if (sessionToken && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If session exists and user tries to access login, redirect to dashboard
  if (sessionToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ]
}
