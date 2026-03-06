import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getVotingStartOptions } from '../lib/vote-engine'

export const Route = createFileRoute('/api/vote/options')({
  server: {
    handlers: {
      GET: async () => {
        const options = await getVotingStartOptions()
        return json({ ok: true, ...options })
      },
    },
  },
})
