import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const rolesCount = await prisma.role.count();
    const usersCount = await prisma.user.count();
    const artworksCount = await prisma.artwork.count();

    const payload = {
      ok: true,
      appEnv: process.env.APP_ENV || 'unknown',
      database: 'connected',
      stats: {
        roles: rolesCount,
        users: usersCount,
        artworks: artworksCount
      },
      timestamp: new Date().toISOString()
    };

    logger.info('Health check success', payload);

    return NextResponse.json(payload);
  } catch (error) {
    logger.error('Health check failed', error);

    return NextResponse.json(
      {
        ok: false,
        database: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}