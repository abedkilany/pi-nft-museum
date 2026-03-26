import { prisma } from "@/lib/prisma"

export async function track(data: {
  type: string
  step?: string
  status?: string
  userId?: string
  sessionId?: string
  path?: string
  metadata?: any
}) {
  try {
    await prisma.event.create({
      data: {
        type: data.type,
        userId: data.userId ?? null,
        sessionId: data.sessionId ?? "system",
        path: data.path ?? null,
        metadata: {
          step: data.step,
          status: data.status,
          ...data.metadata
        }
      }
    })
  } catch {}
}
