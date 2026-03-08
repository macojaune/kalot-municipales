import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { withServerErrorLogging } from '../lib/server-monitoring'
import { listElectoralListsForAdmin } from '../lib/vote-engine'

export const Route = createFileRoute('/api/electoral-lists')({
  server: {
    handlers: {
      GET: withServerErrorLogging('/api/electoral-lists', async ({ request }) => {
        const url = new URL(request.url)
        const communeName = url.searchParams.get('communeName')
        const communes = await listElectoralListsForAdmin({
          communeName,
          excludeListsWithActiveTracks: true,
        })

        return json({
          ok: true,
          communes,
        }, {
          headers: {
            'Cache-Control':
              'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
          },
        })
      }),
    },
  },
})
