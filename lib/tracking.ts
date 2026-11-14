export type CustomWhopEvent =
  "service_viewed" | "deposit_started" | "estimate_requested";
declare global {
  interface Window {
    whop?: {
      track: (event: string, properties?: Record<string, unknown>) => void;
    };
  }
}
export function trackCustomEvent(
  event: CustomWhopEvent,
  properties: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return;
  const payload = { ...properties, event_id: crypto.randomUUID(), timestamp: new Date().toISOString() };
  // Never include homeowner contact information in analytics.
  try {
    if (typeof window.whop?.track === "function")
      window.whop.track(event, payload);
    else if (process.env.NODE_ENV !== "production")
      console.debug(`[whop.track fallback] ${event}`, payload);
  } catch {
    /* Analytics must not block checkout or lead capture. */
  }
  window.dispatchEvent(
    new CustomEvent("roofing:analytics", {
      detail: { event, properties: payload },
    }),
  );
}
