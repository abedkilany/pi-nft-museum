// lib/tracking/tracker.ts

// ✅ تعريف global بشكل صحيح لـ TypeScript
declare global {
  // eslint-disable-next-line no-var
  var __SESSION_ID__: string | undefined
}

// ✅ توليد sessionId بطريقة آمنة (browser + SSR)
function generateSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

// ✅ الحصول أو إنشاء sessionId
const sessionId =
  globalThis.__SESSION_ID__ || generateSessionId()

globalThis.__SESSION_ID__ = sessionId

// ✅ دالة التتبع الأساسية
export async function trackEvent(type: string, data: any = {}) {
  try {
    // ⚠️ تأكد أننا في browser
    if (typeof window === "undefined") return

    const payload = {
      type,
      data,
      sessionId,
      path: window.location.pathname,
      ts: Date.now(),
    }

    // ✅ sendBeacon (أفضل للأداء)
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      })
      navigator.sendBeacon("/api/track", blob)
      return
    }

    // ✅ fallback
    await fetch("/api/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true, // مهم للـ unload
    })
  } catch (e) {
    // لا نكسر التطبيق بسبب التتبع
    console.error("Tracking error:", e)
  }
}

// ✅ auto click tracking (مرة واحدة فقط)
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