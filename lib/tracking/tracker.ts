import { sendClientEvent } from '@/lib/observability-client'

export async function trackEvent(type: string, data: Record<string, unknown> = {}) {
  sendClientEvent({
    category: 'USER_ACTION',
    type: 'LEGACY_TRACKER',
    name: type,
    status: 'SUCCESS',
    feature: 'legacy-tracking',
    data,
  })
}
