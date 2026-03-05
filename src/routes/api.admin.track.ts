import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import {
  archiveTrack,
  createTrack,
  listTracksForAdmin,
} from '../lib/vote-engine'

export const Route = createFileRoute('/api/admin/track')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const includeInactive =
          url.searchParams.get('includeInactive') === 'true'
        const limitParam = url.searchParams.get('limit')
        const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 200

        const tracks = await listTracksForAdmin({
          includeInactive,
          limit: Number.isNaN(parsedLimit) ? 200 : parsedLimit,
        })

        return json({
          ok: true,
          tracks,
        })
      },
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          title?: string
          artistName?: string
          communeName?: string
          listName?: string | null
          candidateName?: string | null
          streamUrl?: string | null
          r2Key?: string | null
        }

        if (!body.title || !body.artistName || !body.communeName) {
          return json(
            {
              ok: false,
              code: 'INVALID_BODY',
              message: 'title, artistName et communeName sont requis.',
            },
            { status: 400 },
          )
        }

        const track = await createTrack({
          title: body.title,
          artistName: body.artistName,
          communeName: body.communeName,
          listName: body.listName,
          candidateName: body.candidateName,
          streamUrl: body.streamUrl,
          r2Key: body.r2Key,
        })

        return json({ ok: true, track })
      },
      DELETE: async ({ request }) => {
        const body = (await request.json()) as {
          trackId?: number
        }

        if (typeof body.trackId !== 'number') {
          return json(
            {
              ok: false,
              code: 'INVALID_BODY',
              message: 'trackId est requis.',
            },
            { status: 400 },
          )
        }

        const result = await archiveTrack({
          trackId: body.trackId,
        })

        if (!result.ok) {
          return json(result, { status: 404 })
        }

        return json(result)
      },
    },
  },
})
