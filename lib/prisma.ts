import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}


prisma.$use(async (params, next) => {
  const start = Date.now()
  const result = await next(params)
  const duration = Date.now() - start

  try {
    await prisma.event.create({
      data: {
        type: 'db_query',
        sessionId: 'server',
        metadata: {
          model: params.model,
          action: params.action,
          duration
        }
      }
    })
  } catch {}

  return result
})
