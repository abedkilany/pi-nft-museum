import { prisma } from "@/lib/prisma"

export async function trackServerEvent(data: {
  type: string
  userId?: string
  sessionId?: string
  path?: string
  metadata?: any
}) {
  try {
    await prisma.event.create({
      data: {
        type: data.type,
        userId: data.userId,
        sessionId: data.sessionId || "server",
        path: data.path,
        metadata: data.metadata || {},
      },
    })
  } catch (e) {
    console.error("SERVER TRACK ERROR", e)
  }
}
