import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    await prisma.event.create({
      data: {
        type: body.type ?? "unknown",
        sessionId: body.sessionId ?? "anon",
        path: body.path ?? null,
        metadata: body.data ?? {},
      }
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
