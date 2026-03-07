import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { listElectoralListsForAdmin } from '../lib/vote-engine'

export const Route = createFileRoute('/api/electoral-lists')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const communeName = url.searchParams.get('communeName')
        const communes = await listElectoralListsForAdmin({ communeName })

        return json({
          ok: true,
          communes,
        }, {
          headers: {
            'Cache-Control':
              'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
          },
        })
      },
    },
  },
})
