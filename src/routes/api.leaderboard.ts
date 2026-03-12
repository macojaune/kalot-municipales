import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { withServerErrorLogging } from '../lib/server-monitoring'
import { getLeaderboard } from '../lib/vote-engine'
import { isRegion } from '../types/song'

export const Route = createFileRoute('/api/leaderboard')({
  server: {
    handlers: {
      GET: withServerErrorLogging('/api/leaderboard', async ({ request }) => {
        const url = new URL(request.url)
        const communeSlug = url.searchParams.get('commune')
        const electionRoundParam = url.searchParams.get('round')
        const limitParam = url.searchParams.get('limit')
        const regionParam = url.searchParams.get('region')
        const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 20

        const leaderboard = await getLeaderboard({
          electionRound:
            electionRoundParam === 'round1' || electionRoundParam === 'round2'
              ? electionRoundParam
              : null,
          region: isRegion(regionParam) ? regionParam : null,
          communeSlug,
          limit: Number.isNaN(parsedLimit) ? 20 : parsedLimit,
        })

        return json({
          ok: true,
          leaderboard,
        }, {
          headers: {
            'Cache-Control': 'public, max-age=0, s-maxage=15, stale-while-revalidate=60',
          },
        })
      }),
    },
  },
})
