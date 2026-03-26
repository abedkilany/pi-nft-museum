'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { sendClientEvent } from '@/lib/observability-client'

export function useNavigationTracking() {
  const pathname = usePathname()
  const prev = useRef(pathname)

  useEffect(() => {
    if (prev.current !== pathname) {
      sendClientEvent({
        category: 'TRACE',
        type: 'NAVIGATION',
        name: 'navigation.change',
        status: 'SUCCESS',
        feature: 'navigation',
        message: `${prev.current} -> ${pathname}`,
        data: {
          from: prev.current,
          to: pathname,
        }
      }, { beginTrace: true, beginSpan: true })
      prev.current = pathname
    }
  }, [pathname])
}
