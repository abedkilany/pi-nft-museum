import { PrismaClient as PrismaClientConstructor } from '@prisma/client';
type PrismaClientInstance = InstanceType<typeof PrismaClientConstructor>;
const globalForPrisma = globalThis as unknown as { prisma: PrismaClientInstance | undefined; };
export const prisma = globalForPrisma.prisma ?? new PrismaClientConstructor({ log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
