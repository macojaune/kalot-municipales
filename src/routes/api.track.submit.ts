import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { createTrack } from '../lib/vote-engine'
import { deleteAudioFromR2, uploadAudioToR2 } from '../lib/r2'

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const Route = createFileRoute('/api/track/submit')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData()
        const externalUserId =
          typeof formData.get('externalUserId') === 'string'
            ? formData.get('externalUserId')?.trim()
            : ''
        const electoralListId = parseOptionalNumber(formData.get('electoralListId'))
        const title =
          typeof formData.get('title') === 'string' ? formData.get('title') : ''
        const artistName =
          typeof formData.get('artistName') === 'string'
            ? formData.get('artistName')
            : null
        const audioFile = formData.get('audio')

        if (!externalUserId) {
          return json(
            {
              ok: false,
              code: 'UNAUTHORIZED',
              message: 'Connexion requise.',
            },
            { status: 401 },
          )
        }

        if (typeof electoralListId !== 'number') {
          return json(
            {
              ok: false,
              code: 'INVALID_BODY',
              message: 'La tete de liste est requise.',
            },
            { status: 400 },
          )
        }

        if (!(audioFile instanceof File)) {
          return json(
            {
              ok: false,
              code: 'INVALID_BODY',
              message: 'Le fichier audio est requis.',
            },
            { status: 400 },
          )
        }

        let uploaded: { key: string; url: string } | null = null

        try {
          uploaded = await uploadAudioToR2(audioFile)

          const track = await createTrack({
            electoralListId,
            title,
            artistName,
            streamUrl: uploaded.url,
            r2Key: uploaded.key,
          })

          return json({ ok: true, track })
        } catch (error) {
          if (uploaded?.key) {
            await deleteAudioFromR2(uploaded.key).catch(() => undefined)
          }

          return json(
            {
              ok: false,
              code: 'TRACK_CREATE_FAILED',
              message:
                error instanceof Error
                  ? error.message
                  : 'Impossible d ajouter le son.',
            },
            { status: 400 },
          )
        }
      },
    },
  },
})
