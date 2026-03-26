export async function trackEvent(event: string, data: any = {}) {
  try {
    await fetch("/api/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.error("Tracking failed", e);
  }
}
