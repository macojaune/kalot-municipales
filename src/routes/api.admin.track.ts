import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { captureServerError, getRequestId, withServerErrorLogging } from '../lib/server-monitoring'
import {
  assertAdminAccess,
  archiveTrack,
  createTrack,
  listTracksForAdmin,
} from '../lib/vote-engine'
import { deleteAudioFromR2, uploadAudioToR2 } from '../lib/r2'
import { isRegion } from '../types/song'

type CreateTrackPayload = {
  externalUserId?: string | null
  electoralListId?: number | null
  title?: string
  artistName?: string | null
  isAiGenerated?: boolean
  communeName?: string
  listName?: string | null
  candidateName?: string | null
  streamUrl?: string | null
  r2Key?: string | null
  audioFile?: File | null
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseBoolean(value: FormDataEntryValue | unknown) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value !== 'string') {
    return false
  }

  return value === 'true' || value === '1' || value === 'on'
}

async function parseCreateTrackPayload(request: Request): Promise<CreateTrackPayload> {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const audioCandidate = formData.get('audio')

    return {
      externalUserId:
        typeof formData.get('externalUserId') === 'string'
          ? formData.get('externalUserId')
          : null,
      electoralListId: parseOptionalNumber(formData.get('electoralListId')),
      title:
        typeof formData.get('title') === 'string' ? formData.get('title') : '',
      artistName:
        typeof formData.get('artistName') === 'string'
          ? formData.get('artistName')
          : null,
      isAiGenerated: parseBoolean(formData.get('isAiGenerated')),
      communeName:
        typeof formData.get('communeName') === 'string'
          ? formData.get('communeName')
          : undefined,
      listName:
        typeof formData.get('listName') === 'string'
          ? formData.get('listName')
          : null,
      candidateName:
        typeof formData.get('candidateName') === 'string'
          ? formData.get('candidateName')
          : null,
      streamUrl:
        typeof formData.get('streamUrl') === 'string'
          ? formData.get('streamUrl')
          : null,
      r2Key:
        typeof formData.get('r2Key') === 'string' ? formData.get('r2Key') : null,
      audioFile: audioCandidate instanceof File ? audioCandidate : null,
    }
  }

  return (await request.json()) as CreateTrackPayload
}

export const Route = createFileRoute('/api/admin/track')({
  server: {
    handlers: {
      GET: withServerErrorLogging('/api/admin/track', async ({ request }) => {
        const url = new URL(request.url)
        const externalUserId = url.searchParams.get('externalUserId')
        const regionParam = url.searchParams.get('region')

        const access = await assertAdminAccess({ externalUserId })
        if (!access.ok) {
          return json(access, { status: 403 })
        }

        const includeInactive =
          url.searchParams.get('includeInactive') === 'true'
        const limitParam = url.searchParams.get('limit')
        const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 200

        const tracks = await listTracksForAdmin({
          includeInactive,
          limit: Number.isNaN(parsedLimit) ? 200 : parsedLimit,
          region: isRegion(regionParam) ? regionParam : null,
        })

        return json({
          ok: true,
          tracks,
        })
      }),
      POST: withServerErrorLogging('/api/admin/track', async ({ request }) => {
        const requestId = getRequestId(request)
        const body = await parseCreateTrackPayload(request)

        const access = await assertAdminAccess({
          externalUserId: body.externalUserId,
        })
        if (!access.ok) {
          return json(access, { status: 403 })
        }

        if (
          typeof body.electoralListId !== 'number' &&
          !body.communeName
        ) {
          return json(
            {
              ok: false,
              code: 'INVALID_BODY',
              message: 'electoralListId ou communeName est requis.',
            },
            { status: 400 },
          )
        }

        const trimmedStreamUrl = body.streamUrl?.trim() || null

        if (!body.audioFile && !trimmedStreamUrl) {
          return json(
            {
              ok: false,
              code: 'INVALID_BODY',
              message: 'Un fichier audio ou une streamUrl est requis.',
            },
            { status: 400 },
          )
        }

        let uploaded: { key: string; url: string } | null = null

        try {
          if (body.audioFile) {
            uploaded = await uploadAudioToR2(body.audioFile)
          }

          const track = await createTrack({
            electoralListId: body.electoralListId,
            title: body.title,
            artistName: body.artistName,
            isAiGenerated: body.isAiGenerated,
            communeName: body.communeName,
            listName: body.listName,
            candidateName: body.candidateName,
            streamUrl: uploaded?.url ?? trimmedStreamUrl,
            r2Key: uploaded?.key ?? body.r2Key,
          })

          return json({ ok: true, track })
        } catch (error) {
          if (uploaded?.key) {
            await deleteAudioFromR2(uploaded.key).catch(() => undefined)
          }

          await captureServerError({
            request,
            requestId,
            route: '/api/admin/track',
            error,
            properties: {
              externalUserId: body.externalUserId ?? null,
              electoralListId: body.electoralListId ?? null,
              communeName: body.communeName ?? null,
              hasAudioFile: Boolean(body.audioFile),
              isAiGenerated: body.isAiGenerated ?? false,
              fileName: body.audioFile?.name ?? null,
              fileSize: body.audioFile?.size ?? null,
              uploadedKey: uploaded?.key ?? null,
            },
          })

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
      }),
      DELETE: withServerErrorLogging('/api/admin/track', async ({ request }) => {
        const body = (await request.json()) as {
          externalUserId?: string | null
          trackId?: number
        }

        const access = await assertAdminAccess({
          externalUserId: body.externalUserId,
        })
        if (!access.ok) {
          return json(access, { status: 403 })
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
      }),
    },
  },
})
