import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/signup', '/join']

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req })

  // @supabase/ssr middleware pattern — must mutate response cookies to keep session alive
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet: Array<{ name: string; value: string; options: CookieOptions }>) => {
          toSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: req })
          toSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — required on every request to keep JWT fresh
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

  // Not logged in — send to login
  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Logged in — don't let them sit on auth pages
  // (login/page.tsx handles the role-based redirect to /dashboard vs /parent/dashboard)
  if (session && isPublic) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: [
    // Exclude static assets, images, favicon, cron routes, AND the auth callback
    // (callback must run unconditionally — middleware would redirect away before session is set)
    '/((?!_next/static|_next/image|favicon.ico|api/cron|auth/callback).*)',
  ],
}
