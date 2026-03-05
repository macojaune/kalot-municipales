import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { seedDemoTracks } from '../lib/vote-engine'

export const Route = createFileRoute('/api/admin/seed')({
  server: {
    handlers: {
      POST: async () => {
        const result = await seedDemoTracks()
        return json({
          ok: true,
          ...result,
        })
      },
    },
  },
})
