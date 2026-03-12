import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { withServerErrorLogging } from '../lib/server-monitoring'
import { submitBlindtestAnswer } from '../lib/vote-engine'

export const Route = createFileRoute('/api/blindtest/answer')({
  server: {
    handlers: {
      POST: withServerErrorLogging(
        '/api/blindtest/answer',
        async ({ request }) => {
          const body = (await request.json()) as {
            sessionId?: string
            trackId?: number
            guessLabel?: 'ai' | 'human'
          }

          if (
            !body.sessionId ||
            typeof body.trackId !== 'number' ||
            (body.guessLabel !== 'ai' && body.guessLabel !== 'human')
          ) {
            return json(
              {
                ok: false,
                code: 'INVALID_BODY',
                message: 'Parametres invalides.',
              },
              { status: 400 },
            )
          }

          const result = await submitBlindtestAnswer({
            sessionId: body.sessionId,
            trackId: body.trackId,
            guessLabel: body.guessLabel,
          })

          if (!result.ok) {
            return json(result, { status: 400 })
          }

          return json(result)
        },
      ),
    },
  },
})
