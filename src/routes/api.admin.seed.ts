import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { withServerErrorLogging } from '../lib/server-monitoring'
import {
  assertAdminAccess,
  seedElectoralLists,
  seedRegionCommunes,
} from '../lib/vote-engine'
import { isRegion } from '../types/song'

export const Route = createFileRoute('/api/admin/seed')({
  server: {
    handlers: {
      POST: withServerErrorLogging('/api/admin/seed', async ({ request }) => {
        const body = (await request.json()) as {
          externalUserId?: string | null
          region?: string | null
        }

        const access = await assertAdminAccess({
          externalUserId: body.externalUserId,
        })

        if (!access.ok) {
          return json(access, { status: 403 })
        }

        const region = isRegion(body.region) ? body.region : 'guadeloupe'

        const [communesResult, electoralListsResult] = await Promise.all([
          seedRegionCommunes(region),
          seedElectoralLists(region),
        ])

        return json({
          ok: true,
          region,
          communes: communesResult,
          electoralLists: electoralListsResult,
        })
      }),
    },
  },
})
