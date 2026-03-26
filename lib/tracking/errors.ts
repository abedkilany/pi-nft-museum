'use client'

import { sendClientEvent } from '@/lib/observability-client'

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    sendClientEvent({
      category: 'ERROR',
      type: 'CLIENT_ERROR',
      name: 'window.error',
      status: 'FAILED',
      feature: 'client-runtime',
      message: e.message,
      errorName: 'WindowError',
      data: {
        source: e.filename,
        line: e.lineno,
        column: e.colno,
      }
    })
  })

  window.addEventListener('unhandledrejection', (e) => {
    sendClientEvent({
      category: 'ERROR',
      type: 'UNHANDLED_REJECTION',
      name: 'window.unhandledrejection',
      status: 'FAILED',
      feature: 'client-runtime',
      message: e.reason instanceof Error ? e.reason.message : String(e.reason),
      errorName: e.reason instanceof Error ? e.reason.name : 'UnhandledRejection',
    })
  })
}
