export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    await prisma.event.create({
      data: {
        type: body.type,
        sessionId: body.sessionId,
        path: body.path,
        metadata: body.data,
        createdAt: new Date(body.ts),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("TRACK ERROR:", e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
