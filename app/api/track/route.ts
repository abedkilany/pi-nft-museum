import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      type,
      data,
      sessionId,
      path,
      ts
    } = body

    await prisma.event.create({
      data: {
        type,
        sessionId,
        path,
        metadata: data,
        createdAt: new Date(ts),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("TRACK ERROR:", e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
