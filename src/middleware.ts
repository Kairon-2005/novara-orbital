import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/signup', '/join']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

  // Not logged in — send to login
  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Logged in — don't let them sit on auth pages
  if (session && isPublic) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Parent trying to access student routes
  if (session && pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
    // Role check is done in the page/API handler for accuracy
    // Middleware only handles the unauthenticated case
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/cron).*)',
  ],
}
