import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { pickWinner } from '../lib/vote-engine'

export const Route = createFileRoute('/api/vote/pick')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          sessionId?: string
          winnerTrackId?: number
          loserTrackId?: number
          leftTrackId?: number
          rightTrackId?: number
        }

        if (
          !body.sessionId ||
          typeof body.winnerTrackId !== 'number' ||
          typeof body.loserTrackId !== 'number' ||
          typeof body.leftTrackId !== 'number' ||
          typeof body.rightTrackId !== 'number'
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

        const result = await pickWinner({
          sessionId: body.sessionId,
          winnerTrackId: body.winnerTrackId,
          loserTrackId: body.loserTrackId,
          leftTrackId: body.leftTrackId,
          rightTrackId: body.rightTrackId,
        })

        if (!result.ok) {
          return json(result, { status: 400 })
        }

        return json(result)
      },
    },
  },
})
