import { useUser } from '@clerk/clerk-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Lock, Pause, Play, Plus, Trash2, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Layout } from '../components/Layout'
import {
  deleteJson,
  getExternalUserId,
  getJson,
  postFormData,
  postJson,
} from '../lib/kalot-client'
import { buildSeo } from '../lib/seo'

type AdminTrackListResponse =
  | {
      ok: true
      tracks: Array<{
        id: number
        title: string
        artistName: string
        communeName: string
        listName: string | null
        candidateName: string | null
        streamUrl: string | null
        wins: number
        losses: number
        rating: number
        isActive: boolean
      }>
    }
  | {
      ok: false
      code: string
      message: string
    }

type AdminMutationResponse =
  | { ok: true }
  | { ok: false; code?: string; message: string }

type AdminElectoralListResponse =
  | {
      ok: true
      communes: Array<{
        id: number
        name: string
        slug: string
        lists: Array<{
          id: number
          name: string
          slug: string
          candidateName: string | null
          photoUrl: string | null
        }>
      }>
    }
  | {
      ok: false
      code: string
      message: string
    }

const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

export const Route = createFileRoute('/admin')({
  head: () =>
    buildSeo({
      title: 'Administration',
      description: 'Backoffice KalotMunicipales.',
      path: '/admin',
      robots: 'noindex,nofollow',
    }),
  component: AdminPage,
})

function AdminPage() {
  if (!clerkEnabled) {
    return (
      <Layout>
        <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-4 py-16">
          <div className="w-full rounded-3xl border border-primary/30 bg-card/85 p-8 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_28px_80px_rgba(0,0,0,0.35)] backdrop-blur-md">
            <Lock className="mx-auto mb-4 h-8 w-8 text-primary" />
            <h1 className="font-display text-3xl font-bold text-white">
              Admin indisponible
            </h1>
            <p className="mt-3 font-body text-sm text-muted-foreground">
              La configuration Clerk est absente sur cet environnement.
            </p>
          </div>
        </section>
      </Layout>
    )
  }

  return <AdminPageContent />
}

function AdminPageContent() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const externalUserId = getExternalUserId(user)
  const audioInputRef = useRef<HTMLInputElement | null>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)

  const [feedback, setFeedback] = useState<string | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null)
  const [form, setForm] = useState({
    title: '',
    artistName: '',
    communeName: '',
    electoralListId: '',
  })

  const tracksQuery = useQuery({
    queryKey: ['admin-tracks'],
    queryFn: () =>
      getJson<AdminTrackListResponse>(
        `/api/admin/track?includeInactive=true&limit=300&externalUserId=${encodeURIComponent(
          externalUserId ?? '',
        )}`,
      ),
    enabled: Boolean(externalUserId),
  })

  const electoralListsQuery = useQuery({
    queryKey: ['admin-electoral-lists'],
    queryFn: () =>
      getJson<AdminElectoralListResponse>(
        `/api/admin/electoral-lists?externalUserId=${encodeURIComponent(
          externalUserId ?? '',
        )}`,
      ),
    enabled: Boolean(externalUserId),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  })

  const electoralCommunes = useMemo(
    () =>
      electoralListsQuery.data?.ok && Array.isArray(electoralListsQuery.data.communes)
        ? electoralListsQuery.data.communes
        : [],
    [electoralListsQuery.data],
  )

  const selectedCommune = useMemo(
    () =>
      electoralCommunes.find((commune) => commune.name === form.communeName) ?? null,
    [electoralCommunes, form.communeName],
  )

  const selectedElectoralList = useMemo(
    () =>
      selectedCommune?.lists.find(
        (list) => String(list.id) === form.electoralListId,
      ) ?? null,
    [form.electoralListId, selectedCommune],
  )

  const createTrackMutation = useMutation({
    mutationFn: () => {
      const payload = new FormData()
      payload.set('externalUserId', externalUserId ?? '')
      payload.set('electoralListId', form.electoralListId)
      payload.set('title', form.title)
      payload.set('artistName', form.artistName)

      if (form.communeName) {
        payload.set('communeName', form.communeName)
      }

      if (audioFile) {
        payload.set('audio', audioFile)
      }

      return postFormData<AdminMutationResponse>('/api/admin/track', payload)
    },
    onSuccess: async (response) => {
      if (!response.ok) {
        setFeedback(response.message)
        return
      }

      setFeedback('Son ajoute !')
      setForm((previous) => ({
        ...previous,
        title: '',
        artistName: '',
        communeName: '',
        electoralListId: '',
      }))
      setAudioFile(null)
      if (audioInputRef.current) {
        audioInputRef.current.value = ''
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-tracks'] })
    },
    onError: () => {
      setFeedback("Impossible d'ajouter le son.")
    },
  })

  const archiveTrackMutation = useMutation({
    mutationFn: (trackId: number) =>
      deleteJson<AdminMutationResponse>(
        '/api/admin/track',
        { trackId, externalUserId },
      ),
    onSuccess: async (response) => {
      if (!response.ok) {
        setFeedback(response.message)
        return
      }

      setFeedback('Son retire de la competition.')
      await queryClient.invalidateQueries({ queryKey: ['admin-tracks'] })
    },
    onError: () => {
      setFeedback('Impossible de retirer ce son.')
    },
  })

  const seedMutation = useMutation({
    mutationFn: () =>
      postJson<{
        ok: true
        communes: { inserted: number; totalTarget: number }
        electoralLists: {
          created: number
          updated: number
          total: number
          totalCommunes: number
        }
      } | {
        ok: false
        message: string
      }>('/api/admin/seed', { externalUserId }),
    onSuccess: async (response) => {
      if (!response.ok) {
        setFeedback(response.message)
        return
      }

      setFeedback(
        `${response.communes.inserted} communes ajoutees, ${response.electoralLists.created} listes creees, ${response.electoralLists.updated} mises a jour.`,
      )
      await queryClient.invalidateQueries({ queryKey: ['admin-electoral-lists'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-tracks'] })
    },
    onError: () => {
      setFeedback("Impossible d'importer les listes electorales.")
    },
  })

  const adminAccessError =
    (tracksQuery.data && !tracksQuery.data.ok ? tracksQuery.data : null) ||
    (electoralListsQuery.data && !electoralListsQuery.data.ok
      ? electoralListsQuery.data
      : null)

  const adminTracks =
    tracksQuery.data?.ok && Array.isArray(tracksQuery.data.tracks)
      ? tracksQuery.data.tracks
      : []

  function stopAudioPlayback() {
    if (!audioPlayerRef.current) {
      return
    }

    audioPlayerRef.current.pause()
    audioPlayerRef.current.currentTime = 0
    setPlayingTrackId(null)
  }

  async function toggleTrackPlayback(track: (typeof adminTracks)[number]) {
    if (!track.streamUrl) {
      setFeedback('Aucun flux audio disponible pour ce son.')
      return
    }

    if (!audioPlayerRef.current) {
      const audio = new Audio()
      audio.preload = 'none'
      audio.addEventListener('ended', () => {
        setPlayingTrackId(null)
      })
      audio.addEventListener('pause', () => {
        setPlayingTrackId((current) =>
          audio.currentTime > 0 && !audio.ended ? current : null,
        )
      })
      audioPlayerRef.current = audio
    }

    const audio = audioPlayerRef.current

    if (playingTrackId === track.id && !audio.paused) {
      audio.pause()
      setPlayingTrackId(null)
      return
    }

    audio.pause()
    audio.src = track.streamUrl
    audio.currentTime = 0

    try {
      await audio.play()
      setPlayingTrackId(track.id)
      setFeedback(null)
    } catch {
      setPlayingTrackId(null)
      setFeedback("Impossible de lire l'aperçu audio.")
    }
  }

  if (!externalUserId) {
    return (
      <Layout>
        <div className="max-w-sm mx-auto px-4 py-20 space-y-4 animate-fade-in">
          <div className="text-center space-y-2">
            <Lock className="w-10 h-10 mx-auto text-primary" />
            <h1 className="font-display font-bold text-2xl text-glow-green">Admin</h1>
          </div>
          <p className="text-xs text-muted-foreground font-body text-center">
            Connexion requise pour acceder a l'administration.
          </p>
        </div>
      </Layout>
    )
  }

  if (adminAccessError) {
    return (
      <Layout>
        <div className="max-w-sm mx-auto px-4 py-20 space-y-4 animate-fade-in">
          <div className="text-center space-y-2">
            <Lock className="w-10 h-10 mx-auto text-primary" />
            <h1 className="font-display font-bold text-2xl text-glow-green">Admin</h1>
          </div>
          <p className="text-xs text-muted-foreground font-body text-center">
            {adminAccessError.message}
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6 animate-fade-in">
        <h1 className="font-display font-black text-3xl text-primary text-glow-green">Admin</h1>

        <div className="space-y-3 p-4 rounded-xl bg-card/80 border border-primary/35 neon-panel">
          <h2 className="font-display font-bold text-sm text-primary">Ajouter un son</h2>
          <p className="text-xs font-body text-muted-foreground">
            Choisis la commune, la tete de liste et un fichier audio. Le son sera
            envoye vers ton bucket Cloudflare R2 puis lie automatiquement a la base.
          </p>

          <select
            value={form.communeName}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                communeName: event.target.value,
                electoralListId: '',
              }))
            }
            className="w-full p-3 rounded-lg bg-background/85 border border-border font-body text-sm min-h-[44px]"
          >
            <option value="">Commune</option>
            {electoralCommunes.map((commune) => (
              <option key={commune.id} value={commune.name}>
                {commune.name}
              </option>
            ))}
          </select>

          <select
            value={form.electoralListId}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                electoralListId: event.target.value,
              }))
            }
            disabled={!selectedCommune}
            className="w-full p-3 rounded-lg bg-background/85 border border-border font-body text-sm min-h-[44px]"
          >
            <option value="">Tete de liste</option>
            {selectedCommune?.lists.map((electoralList) => (
              <option key={electoralList.id} value={String(electoralList.id)}>
                {electoralList.candidateName || electoralList.name}
              </option>
            ))}
          </select>

          <label className="group flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-primary/45 bg-background/65 px-4 py-4 transition-all hover:border-primary hover:bg-primary/5 hover:box-glow-green">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-primary transition-transform group-hover:scale-105">
              <Upload className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm text-foreground">
                {audioFile ? audioFile.name : 'Selectionner le fichier audio'}
              </p>
              <p className="mt-1 text-xs font-body text-muted-foreground">
                MP3, WAV, M4A, OGG, FLAC, AAC ou WEBM. 25 Mo max.
              </p>
            </div>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.webm"
              className="sr-only"
              onChange={(event) => {
                setAudioFile(event.target.files?.[0] ?? null)
              }}
            />
          </label>

          <input
            value={form.title}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                title: event.target.value,
              }))
            }
            placeholder="Titre optionnel (sinon nom de liste / candidat)…"
            className="w-full p-3 rounded-lg bg-background/85 border border-border font-body text-sm min-h-[44px]"
          />
          <input
            value={form.artistName}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                artistName: event.target.value,
              }))
            }
            placeholder="Artiste connu (optionnel)…"
            className="w-full p-3 rounded-lg bg-background/85 border border-border font-body text-sm min-h-[44px]"
          />

          {selectedElectoralList ? (
            <div className="rounded-lg border border-border bg-background/60 p-3 text-xs font-body text-muted-foreground space-y-1">
              <p>
                <span className="text-foreground">Liste:</span>{' '}
                {selectedElectoralList.name}
              </p>
              <p>
                <span className="text-foreground">Tete de liste:</span>{' '}
                {selectedElectoralList.candidateName || 'Non renseignee'}
              </p>
              {selectedElectoralList.photoUrl ? (
                <p className="truncate">
                  <span className="text-foreground">Photo:</span>{' '}
                  {selectedElectoralList.photoUrl}
                </p>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void createTrackMutation.mutate()}
            disabled={
              createTrackMutation.isPending ||
              !form.electoralListId ||
              !audioFile
            }
            className="w-full py-3 rounded-xl border-2 border-primary bg-transparent text-primary font-display font-bold flex items-center justify-center gap-2 min-h-[44px] hover:bg-primary hover:text-background hover:box-glow-green transition-all"
          >
            <Plus className="w-4 h-4" />
            {createTrackMutation.isPending ? 'Upload en cours…' : 'Ajouter le son'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => void seedMutation.mutate()}
          disabled={seedMutation.isPending}
          className="w-full py-3 rounded-xl border border-secondary/45 bg-secondary/10 text-secondary font-display font-medium min-h-[44px] hover:bg-secondary hover:text-background hover:box-glow-blue transition-all"
        >
          {seedMutation.isPending ? 'Import…' : 'Importer listes electorales'}
        </button>

        {electoralCommunes.length === 0 ? (
          <p className="text-xs text-muted-foreground font-body text-center">
            Importe d'abord le referentiel electoral pour activer le formulaire dynamique.
          </p>
        ) : null}

        <div className="space-y-2">
          <h2 className="font-display font-bold text-sm">
            {adminTracks.length} sons
          </h2>
          {adminTracks.map((song) => (
            <div
              key={song.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-card/80 border border-border neon-panel"
            >
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-sm truncate">
                  {song.title}
                </p>
                <p className="text-xs text-muted-foreground font-body truncate">
                  {song.artistName ? `${song.artistName} · ` : ''}
                  {song.communeName}
                  {song.candidateName ? ` · ${song.candidateName}` : ''} · Elo{' '}
                  <span className="tabular">{Math.round(song.rating)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => void toggleTrackPlayback(song)}
                disabled={!song.streamUrl}
                className="p-2 text-muted-foreground hover:text-primary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={
                  playingTrackId === song.id ? 'Mettre en pause' : 'Lire le son'
                }
              >
                {playingTrackId === song.id ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  stopAudioPlayback()
                  const confirmed = window.confirm(
                    'Supprimer ce son de la competition ?',
                  )
                  if (!confirmed) {
                    return
                  }
                  void archiveTrackMutation.mutate(song.id)
                }}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {feedback ? (
          <p
            aria-live="polite"
            className="text-sm text-muted-foreground font-body text-center"
          >
            {feedback}
          </p>
        ) : null}
      </div>
    </Layout>
  )
}
