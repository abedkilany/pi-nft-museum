declare global {
  var __SESSION_ID__: string | undefined
}

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

const sessionId = globalThis.__SESSION_ID__ || generateSessionId()
globalThis.__SESSION_ID__ = sessionId

export async function trackEvent(type: string, data: any = {}) {
  try {
    if (typeof window === "undefined") return

    const payload = {
      type,
      data,
      sessionId,
      path: window.location.pathname,
      ts: Date.now(),
    }

    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      })
      navigator.sendBeacon("/api/track", blob)
      return
    }

    await fetch("/api/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch (e) {
    console.error("Tracking error:", e)
  }
}

if (typeof window !== "undefined") {
  if (!(window as any).__TRACKING_INITIALIZED__) {
    ;(window as any).__TRACKING_INITIALIZED__ = true

    window.addEventListener("click", (e: any) => {
      try {
        const el = e.target as HTMLElement

        trackEvent("click", {
          tag: el?.tagName,
          id: el?.id,
          class: el?.className,
        })
      } catch {}
    })
  }
}

export {}
