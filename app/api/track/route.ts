import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    await prisma.event.create({
      data: {
        type: typeof body.type === "string" ? body.type : "unknown",
        userId: typeof body.userId === "string" ? body.userId : null,
        sessionId: typeof body.sessionId === "string" ? body.sessionId : "anonymous",
        path: typeof body.path === "string" ? body.path : req.headers.get("x-tracking-path"),
        method: typeof body.method === "string" ? body.method : req.headers.get("x-tracking-method"),
        status: typeof body.status === "number" ? body.status : null,
        metadata: body.data ?? body.metadata ?? {},
        createdAt: body.ts ? new Date(body.ts) : new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("TRACK ERROR:", error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
