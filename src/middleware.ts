import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/signup', '/join']

// Public without redirect-on-login: tokenized share pages are meant to be
// opened by relatives with no account (WeChat webview) — logged-in users may
// view them too.
const OPEN_ROUTES = ['/share/']

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

  // getUser() contacts the Auth server to verify the JWT — more secure than getSession()
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = req.nextUrl
  if (OPEN_ROUTES.some(r => pathname.startsWith(r))) return res
  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

  // Not logged in — send to login
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Logged in — don't let them sit on auth pages.
  // Send to /dashboard; the layout handles parent vs student routing server-side.
  if (user && isPublic) {
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
