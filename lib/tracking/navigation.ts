'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { trackEvent } from './tracker'

export function useNavigationTracking() {
  const pathname = usePathname()
  const prev = useRef(pathname)

  useEffect(() => {
    if (prev.current !== pathname) {
      trackEvent('navigation', {
        from: prev.current,
        to: pathname,
      })
      prev.current = pathname
    }
  }, [pathname])
}
