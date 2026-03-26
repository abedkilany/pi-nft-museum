'use client'

import { trackEvent } from './tracker'

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    trackEvent('error', {
      message: e.message,
      source: e.filename,
    })
  })

  window.addEventListener('unhandledrejection', (e) => {
    trackEvent('error', {
      message: e.reason?.toString(),
    })
  })
}
