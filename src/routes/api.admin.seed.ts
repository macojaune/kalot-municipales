import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { withServerErrorLogging } from '../lib/server-monitoring'
import {
  assertAdminAccess,
  seedElectoralLists,
  seedGuadeloupeCommunes,
} from '../lib/vote-engine'

export const Route = createFileRoute('/api/admin/seed')({
  server: {
    handlers: {
      POST: withServerErrorLogging('/api/admin/seed', async ({ request }) => {
        const body = (await request.json()) as {
          externalUserId?: string | null
        }

        const access = await assertAdminAccess({
          externalUserId: body.externalUserId,
        })

        if (!access.ok) {
          return json(access, { status: 403 })
        }

        const [communesResult, electoralListsResult] = await Promise.all([
          seedGuadeloupeCommunes(),
          seedElectoralLists(),
        ])

        return json({
          ok: true,
          communes: communesResult,
          electoralLists: electoralListsResult,
        })
      }),
    },
  },
})
