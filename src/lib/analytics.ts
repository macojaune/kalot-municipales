import posthog from 'posthog-js'

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
  if (typeof window === 'undefined') {
    return
  }

  if (typeof window.umami?.track === 'function') {
    window.umami.track(eventName, data)
  }

  if (import.meta.env.VITE_POSTHOG_KEY && posthog.__loaded) {
    posthog.capture(eventName, data)
  }
}
