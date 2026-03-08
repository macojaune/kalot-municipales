import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { withServerErrorLogging } from '../lib/server-monitoring'
import { getSessionState } from '../lib/vote-engine'

export const Route = createFileRoute('/api/vote/state')({
  server: {
    handlers: {
      GET: withServerErrorLogging('/api/vote/state', async ({ request }) => {
        const url = new URL(request.url)
        const sessionId = url.searchParams.get('sessionId')

        if (!sessionId) {
          return json(
            {
              ok: false,
              code: 'MISSING_SESSION',
              message: 'sessionId manquant.',
            },
            { status: 400 },
          )
        }

        const state = await getSessionState({ sessionId })
        if (!state) {
          return json(
            {
              ok: false,
              code: 'SESSION_NOT_FOUND',
              message: 'Session introuvable.',
            },
            { status: 404 },
          )
        }

        return json({ ok: true, ...state })
      }),
    },
  },
})
