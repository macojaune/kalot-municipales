declare global {
  interface Window {
    umami?: {
      track: (eventName: string, data?: Record<string, unknown>) => void
    }
  }
}

export function trackEvent(
  eventName: string,
  data?: Record<string, unknown>,
) {
  if (typeof window === 'undefined' || typeof window.umami?.track !== 'function') {
    return
  }

  window.umami.track(eventName, data)
}
