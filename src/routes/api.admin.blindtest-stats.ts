import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { withServerErrorLogging } from '../lib/server-monitoring'
import {
  assertAdminAccess,
  listBlindtestStatsForAdmin,
} from '../lib/vote-engine'

export const Route = createFileRoute('/api/admin/blindtest-stats')({
  server: {
    handlers: {
      GET: withServerErrorLogging(
        '/api/admin/blindtest-stats',
        async ({ request }) => {
          const url = new URL(request.url)
          const externalUserId = url.searchParams.get('externalUserId')

          const access = await assertAdminAccess({ externalUserId })
          if (!access.ok) {
            return json(access, { status: 403 })
          }

          const stats = await listBlindtestStatsForAdmin()
          return json({
            ok: true,
            stats,
          })
        },
      ),
    },
  },
})
