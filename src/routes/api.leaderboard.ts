import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getLeaderboard } from '../lib/vote-engine'

export const Route = createFileRoute('/api/leaderboard')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const communeSlug = url.searchParams.get('commune')
        const electionRoundParam = url.searchParams.get('round')
        const limitParam = url.searchParams.get('limit')
        const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 20

        const leaderboard = await getLeaderboard({
          electionRound:
            electionRoundParam === 'round1' || electionRoundParam === 'round2'
              ? electionRoundParam
              : null,
          communeSlug,
          limit: Number.isNaN(parsedLimit) ? 20 : parsedLimit,
        })

        return json({
          ok: true,
          leaderboard,
        })
      },
    },
  },
})
