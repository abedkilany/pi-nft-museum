import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function createId() {
  return crypto.randomUUID()
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const requestHeaders = new Headers(req.headers)
  const traceId = requestHeaders.get('x-trace-id') || requestHeaders.get('x-correlation-id') || createId()
  const requestId = requestHeaders.get('x-request-id') || requestHeaders.get('x-vercel-id') || createId()
  const sessionId = requestHeaders.get('x-session-id') || req.cookies.get('pi_session')?.value || 'server'

  requestHeaders.set('x-trace-id', traceId)
  requestHeaders.set('x-correlation-id', traceId)
  requestHeaders.set('x-request-id', requestId)
  requestHeaders.set('x-session-id', sessionId)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  response.headers.set('x-trace-id', traceId)
  response.headers.set('x-request-id', requestId)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
