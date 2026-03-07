import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { assertAdminAccess, listElectoralListsForAdmin } from '../lib/vote-engine'

export const Route = createFileRoute('/api/admin/electoral-lists')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const externalUserId = url.searchParams.get('externalUserId')
        const communeName = url.searchParams.get('communeName')

        const access = await assertAdminAccess({ externalUserId })
        if (!access.ok) {
          return json(access, { status: 403 })
        }

        const communes = await listElectoralListsForAdmin({ communeName })

        return json({
          ok: true,
          communes,
        })
      },
    },
  },
})
