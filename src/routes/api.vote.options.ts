import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { withServerErrorLogging } from '../lib/server-monitoring'
import { getVotingStartOptions } from '../lib/vote-engine'
import { isRegion } from '../types/song'

export const Route = createFileRoute('/api/vote/options')({
  server: {
    handlers: {
      GET: withServerErrorLogging('/api/vote/options', async ({ request }) => {
        const url = new URL(request.url)
        const regionParam = url.searchParams.get('region')
        const options = await getVotingStartOptions({
          region: isRegion(regionParam) ? regionParam : null,
        })
        return json({ ok: true, ...options })
      }),
    },
  },
})
