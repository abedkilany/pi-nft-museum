let sessionId = globalThis.__SESSION_ID__ || crypto.randomUUID();
globalThis.__SESSION_ID__ = sessionId;

export async function trackEvent(type: string, data: any = {}) {
  try {
    navigator.sendBeacon?.("/api/track", JSON.stringify({
      type,
      data,
      sessionId,
      path: window.location.pathname,
      ts: Date.now()
    })) || fetch("/api/track", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        type,
        data,
        sessionId,
        path: window.location.pathname,
        ts: Date.now()
      })
    });
  } catch {}
}

// auto click tracking
if (typeof window !== "undefined") {
  window.addEventListener("click", (e: any) => {
    const target = e.target?.tagName;
    trackEvent("click", { tag: target });
  });
}
