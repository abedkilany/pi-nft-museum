import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function middleware(req: NextRequest) {
  const start = Date.now()

  const res = NextResponse.next()

  const duration = Date.now() - start

  try {
    await prisma.event.create({
      data: {
        type: 'request',
        sessionId: 'server',
        path: req.nextUrl.pathname,
        metadata: {
          method: req.method,
          duration
        }
      }
    })
  } catch {}

  return res
}
