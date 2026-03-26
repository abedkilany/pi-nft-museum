import { PrismaClient } from '@prisma/client'
import { getServerTraceContext, withServerSpan } from '@/lib/server-trace'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaTracingInitialized: boolean | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  })

if (!globalForPrisma.prismaTracingInitialized) {
  const anyPrisma = prisma as any
  if (typeof anyPrisma.$use === 'function') {
    anyPrisma.$use(async (params: any, next: (params: any) => Promise<any>) => {
      const trace = getServerTraceContext()
      if (!trace) return next(params)

      const model = params?.model || 'UnknownModel'
      const action = params?.action || 'query'
      return withServerSpan({
        name: `db.${String(model).toLowerCase()}.${String(action).toLowerCase()}`,
        eventKey: 'PRISMA_QUERY',
        type: 'DB_QUERY',
        category: 'TRACE',
        feature: 'database',
        data: {
          model,
          action,
        }
      }, async () => next(params))
    })
  }

  globalForPrisma.prismaTracingInitialized = true
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
