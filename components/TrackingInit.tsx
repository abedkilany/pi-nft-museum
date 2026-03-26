'use client'

import '@/lib/tracking/tracker'
import '@/lib/tracking/errors'
import { useNavigationTracking } from '@/lib/tracking/navigation'

export default function TrackingInit() {
  useNavigationTracking()
  return null
}
