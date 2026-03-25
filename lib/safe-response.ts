import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export function safeError(error: unknown, status = 500) {
  if (error instanceof Error) {
    logger.error('API_ROUTE_ERROR', {
      message: error.message,
      stack: error.stack ?? null,
      status,
    });
  } else {
    logger.error('API_ROUTE_ERROR', {
      message: 'Unknown server error',
      status,
    });
  }

  return NextResponse.json(
    {
      error:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : error instanceof Error
            ? error.message
            : 'Unknown server error',
    },
    { status },
  );
}
