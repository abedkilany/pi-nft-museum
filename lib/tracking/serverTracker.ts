import { prisma } from "@/lib/prisma"

export async function trackFlow({
  flow,
  step,
  status,
  userId,
  sessionId,
  metadata
}: {
  flow: string
  step: string
  status: "start" | "success" | "fail"
  userId?: string
  sessionId?: string
  metadata?: any
}) {
  try {
    await prisma.event.create({
      data: {
        type: flow + "_" + step + "_" + status,
        userId,
        sessionId: sessionId || "server",
        metadata: metadata || {},
      },
    })
  } catch (e) {
    console.error("FLOW TRACK ERROR", e)
  }
}
