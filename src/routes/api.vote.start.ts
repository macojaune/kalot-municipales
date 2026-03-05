import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { startVoteSession } from '../lib/vote-engine'

export const Route = createFileRoute('/api/vote/start')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          externalUserId?: string
          username?: string | null
        }

        if (!body.externalUserId) {
          return json(
            {
              ok: false,
              code: 'MISSING_USER',
              message: 'Utilisateur non connecte.',
            },
            { status: 400 },
          )
        }

        const result = await startVoteSession({
          externalUserId: body.externalUserId,
          username: body.username,
        })

        if (!result.ok) {
          return json(result, { status: 400 })
        }

        return json(result)
      },
    },
  },
})
