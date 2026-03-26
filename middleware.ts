import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'

export function middleware(req: NextRequest, event: NextFetchEvent) {
  const pathname = req.nextUrl.pathname

  if (
    pathname.startsWith('/api/track') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const res = NextResponse.next()

  event.waitUntil(
    fetch(new URL('/api/track', req.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'request',
        sessionId: req.cookies.get('pi_session')?.value || 'server',
        path: pathname,
        ts: Date.now(),
        data: {
          method: req.method,
          source: 'middleware',
        },
      }),
    }).catch(() => undefined)
  )

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
