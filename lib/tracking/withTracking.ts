import { trackFlow } from './serverTracker'

export async function withTracking(flow: string, fn: Function) {
  return async (...args: any[]) => {
    await trackFlow({ flow, step: 'start', status: 'start' })

    try {
      const result = await fn(...args)
      await trackFlow({ flow, step: 'complete', status: 'success' })
      return result
    } catch (e) {
      await trackFlow({
        flow,
        step: 'error',
        status: 'fail',
        metadata: { error: String(e) }
      })
      throw e
    }
  }
}
