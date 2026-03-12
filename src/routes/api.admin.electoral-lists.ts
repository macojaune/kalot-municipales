import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { withServerErrorLogging } from '../lib/server-monitoring'
import { assertAdminAccess, listElectoralListsForAdmin } from '../lib/vote-engine'
import { isRegion } from '../types/song'

export const Route = createFileRoute('/api/admin/electoral-lists')({
  server: {
    handlers: {
      GET: withServerErrorLogging('/api/admin/electoral-lists', async ({ request }) => {
        const url = new URL(request.url)
        const externalUserId = url.searchParams.get('externalUserId')
        const communeName = url.searchParams.get('communeName')
        const regionParam = url.searchParams.get('region')

        const access = await assertAdminAccess({ externalUserId })
        if (!access.ok) {
          return json(access, { status: 403 })
        }

        const communes = await listElectoralListsForAdmin({
          communeName,
          region: isRegion(regionParam) ? regionParam : null,
        })

        return json({
          ok: true,
          communes,
        })
      }),
    },
  },
})
