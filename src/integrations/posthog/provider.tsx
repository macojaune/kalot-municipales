import { useUser } from '@clerk/clerk-react'
import posthog from 'posthog-js'
import { useEffect } from 'react'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY?.trim()
const POSTHOG_HOST =
  import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com'

export const posthogEnabled = Boolean(POSTHOG_KEY)

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!POSTHOG_KEY || typeof window === 'undefined' || posthog.__loaded) {
      return
    }

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: true,
      capture_pageview: 'history_change',
      capture_pageleave: 'if_capture_pageview',
      capture_exceptions: true,
      disable_session_recording: false,
      loaded: (client) => {
        if (import.meta.env.DEV) {
          client.debug()
        }
      },
    })
  }, [])

  return children
}

export function PostHogClerkIdentity() {
  const { isLoaded, isSignedIn, user } = useUser()

  useEffect(() => {
    if (!posthogEnabled || !isLoaded || typeof window === 'undefined') {
      return
    }

    if (!isSignedIn) {
      posthog.reset()
      return
    }

    posthog.identify(user.id, {
      email: user.primaryEmailAddress?.emailAddress ?? undefined,
      name: user.fullName ?? undefined,
      username: user.username ?? undefined,
    })
  }, [isLoaded, isSignedIn, user])

  return null
}
