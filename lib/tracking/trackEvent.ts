import { sendClientEvent } from '@/lib/observability-client'

export async function trackEvent(event: string, data: Record<string, unknown> = {}) {
  sendClientEvent({
    category: 'USER_ACTION',
    type: 'LEGACY_TRACKER',
    name: event,
    status: 'SUCCESS',
    feature: 'legacy-tracking',
    data,
  })
}
