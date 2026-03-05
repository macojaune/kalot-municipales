import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { submitReport } from '../lib/vote-engine'

export const Route = createFileRoute('/api/report')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          trackId?: number
          reason?: string
          externalUserId?: string | null
        }

        if (typeof body.trackId !== 'number' || !body.reason?.trim()) {
          return json(
            {
              ok: false,
              code: 'INVALID_BODY',
              message: 'trackId et reason sont requis.',
            },
            { status: 400 },
          )
        }

        const result = await submitReport({
          trackId: body.trackId,
          reason: body.reason.trim(),
          externalUserId: body.externalUserId,
        })

        return json(result)
      },
    },
  },
})
