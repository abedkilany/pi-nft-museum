import { prisma } from "@/lib/prisma"

export async function flowTrack(flow: string, step: string, status: string, meta: any = {}) {
  try {
    await prisma.event.create({
      data: {
        type: flow,
        sessionId: "server",
        metadata: { step, status, ...meta }
      }
    })
  } catch {}
}
