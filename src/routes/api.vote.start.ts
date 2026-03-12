import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { withServerErrorLogging } from '../lib/server-monitoring'
import { startVoteSession } from '../lib/vote-engine'
import { isRegion } from '../types/song'

export const Route = createFileRoute('/api/vote/start')({
  server: {
    handlers: {
      POST: withServerErrorLogging('/api/vote/start', async ({ request }) => {
        const body = (await request.json()) as {
          externalUserId?: string
          username?: string | null
          communeSlug?: string | null
          region?: string | null
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
          communeSlug: body.communeSlug,
          region: isRegion(body.region) ? body.region : null,
        })

        if (!result.ok) {
          return json(result, { status: 400 })
        }

        return json(result)
      }),
    },
  },
})
