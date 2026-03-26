import { withServerSpan } from '@/lib/server-trace'

export async function trackFlow({
  flow,
  step,
  status,
  metadata
}: {
  flow: string
  step: string
  status: 'start' | 'success' | 'fail'
  userId?: string
  sessionId?: string
  metadata?: Record<string, unknown>
}) {
  await withServerSpan({
    name: `${flow}.${step}`,
    eventKey: `${flow}.${step}`,
    type: 'FLOW_STEP',
    category: 'TRACE',
    feature: 'server-flow',
    data: {
      status,
      ...(metadata || {}),
    }
  }, async () => undefined)
}
