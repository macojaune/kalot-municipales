import { useUser } from '@clerk/clerk-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Lock, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Layout } from '../components/Layout'
import { useRegion } from '../context/RegionContext'
import {
  deleteJson,
  getExternalUserId,
  getJson,
  postJson,
} from '../lib/kalot-client'
import type { Region } from '../types/song'
import { COMMUNES, REGION_LABELS } from '../types/song'

const ADMIN_PASSWORD = 'kalot2026'

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

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

function AdminPage() {
  const { user } = useUser()
  const { region } = useRegion()
  const queryClient = useQueryClient()
  const externalUserId = getExternalUserId(user)

  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    artistName: '',
    region: region ?? 'guadeloupe',
    communeName: '',
    listName: '',
    candidateName: '',
    streamUrl: '',
  })

  const tracksQuery = useQuery({
    queryKey: ['admin-tracks'],
    queryFn: () =>
      getJson<AdminTrackListResponse>(
        `/api/admin/track?includeInactive=true&limit=300&externalUserId=${encodeURIComponent(
          externalUserId ?? '',
        )}`,
      ),
    enabled: authenticated && Boolean(externalUserId),
  })

  const createTrackMutation = useMutation({
    mutationFn: () =>
      postJson<AdminMutationResponse>(
        '/api/admin/track',
        {
          externalUserId,
          title: form.title,
          artistName: form.artistName,
          communeName: form.communeName,
          listName: form.listName || null,
          candidateName: form.candidateName || null,
          streamUrl: form.streamUrl || null,
        },
      ),
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
        listName: '',
        candidateName: '',
        streamUrl: '',
      }))
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
        tracks: { created: number; total: number }
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
        `${response.communes.inserted} communes ajoutees, ${response.tracks.created} sons demo injectes !`,
      )
      await queryClient.invalidateQueries({ queryKey: ['admin-tracks'] })
    },
    onError: () => {
      setFeedback("Impossible d'injecter les donnees demo.")
    },
  })

  const adminAccessError =
    tracksQuery.data && !tracksQuery.data.ok ? tracksQuery.data : null

  const adminTracks =
    tracksQuery.data?.ok && Array.isArray(tracksQuery.data.tracks)
    ? tracksQuery.data.tracks
    : []

  if (!externalUserId) {
    return (
      <Layout>
        <div className="max-w-sm mx-auto px-4 py-20 space-y-4 animate-fade-in">
          <div className="text-center space-y-2">
            <Lock className="w-10 h-10 mx-auto text-muted-foreground" />
            <h1 className="font-display font-bold text-xl">Admin</h1>
          </div>
          <p className="text-xs text-muted-foreground font-body text-center">
            Connexion requise pour acceder a l'administration.
          </p>
        </div>
      </Layout>
    )
  }

  if (!authenticated) {
    return (
      <Layout>
        <div className="max-w-sm mx-auto px-4 py-20 space-y-4 animate-fade-in">
          <div className="text-center space-y-2">
            <Lock className="w-10 h-10 mx-auto text-muted-foreground" />
            <h1 className="font-display font-bold text-xl">Admin</h1>
          </div>
          <input
            type="password"
            name="adminPassword"
            autoComplete="current-password"
            aria-label="Mot de passe"
            placeholder="Mot de passe admin…"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && password === ADMIN_PASSWORD) {
                setAuthenticated(true)
              }
            }}
            className="w-full p-3 rounded-xl bg-card border border-border font-body min-h-[44px]"
          />
          <button
            type="button"
            onClick={() => {
              if (password === ADMIN_PASSWORD) {
                setFeedback(null)
                setAuthenticated(true)
                return
              }
              setFeedback('Mot de passe incorrect.')
            }}
            className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground font-display font-bold min-h-[44px]"
          >
            Entrer
          </button>
          {feedback ? (
            <p
              aria-live="polite"
              className="text-xs text-muted-foreground font-body text-center"
            >
              {feedback}
            </p>
          ) : null}
        </div>
      </Layout>
    )
  }

  if (adminAccessError) {
    return (
      <Layout>
        <div className="max-w-sm mx-auto px-4 py-20 space-y-4 animate-fade-in">
          <div className="text-center space-y-2">
            <Lock className="w-10 h-10 mx-auto text-muted-foreground" />
            <h1 className="font-display font-bold text-xl">Admin</h1>
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
        <h1 className="font-display font-black text-2xl">Admin</h1>

        <div className="space-y-3 p-4 rounded-xl bg-card border border-border">
          <h2 className="font-display font-bold text-sm">Ajouter un son</h2>

          <input
            value={form.title}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                title: event.target.value,
              }))
            }
            placeholder="Titre (ex: Mairie an nou)…"
            className="w-full p-3 rounded-lg bg-background border border-border font-body text-sm min-h-[44px]"
          />
          <input
            value={form.artistName}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                artistName: event.target.value,
              }))
            }
            placeholder="Artiste (ex: DJ Kalot)…"
            className="w-full p-3 rounded-lg bg-background border border-border font-body text-sm min-h-[44px]"
          />
          <input
            value={form.listName}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                listName: event.target.value,
              }))
            }
            placeholder="Liste electorale…"
            className="w-full p-3 rounded-lg bg-background border border-border font-body text-sm min-h-[44px]"
          />
          <input
            value={form.candidateName}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                candidateName: event.target.value,
              }))
            }
            placeholder="Candidat…"
            className="w-full p-3 rounded-lg bg-background border border-border font-body text-sm min-h-[44px]"
          />
          <input
            type="url"
            inputMode="url"
            value={form.streamUrl}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                streamUrl: event.target.value,
              }))
            }
            placeholder="URL audio (ex: https://cdn.exemple.com/track.mp3)…"
            className="w-full p-3 rounded-lg bg-background border border-border font-body text-sm min-h-[44px]"
          />

          <select
            value={form.region}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                region: event.target.value as Region,
                communeName: '',
              }))
            }
            className="w-full p-3 rounded-lg bg-background border border-border font-body text-sm min-h-[44px]"
          >
            {(Object.keys(REGION_LABELS) as Region[]).map((entryRegion) => (
              <option key={entryRegion} value={entryRegion}>
                {REGION_LABELS[entryRegion]}
              </option>
            ))}
          </select>

          <select
            value={form.communeName}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                communeName: event.target.value,
              }))
            }
            className="w-full p-3 rounded-lg bg-background border border-border font-body text-sm min-h-[44px]"
          >
            <option value="">Commune</option>
            {COMMUNES[form.region].map((communeName) => (
              <option key={communeName} value={communeName}>
                {communeName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void createTrackMutation.mutate()}
            disabled={createTrackMutation.isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            {createTrackMutation.isPending ? 'Ajout…' : 'Ajouter'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => void seedMutation.mutate()}
          disabled={seedMutation.isPending}
          className="w-full py-3 rounded-xl bg-muted text-foreground font-body font-medium min-h-[44px]"
        >
          {seedMutation.isPending ? 'Injection…' : 'Injecter sons demo'}
        </button>

        <div className="space-y-2">
          <h2 className="font-display font-bold text-sm">
            {adminTracks.length} sons
          </h2>
          {adminTracks.map((song) => (
            <div
              key={song.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
            >
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-sm truncate">
                  {song.title}
                </p>
                <p className="text-xs text-muted-foreground font-body truncate">
                  {song.artistName} · {song.communeName} · Elo{' '}
                  <span className="tabular">{Math.round(song.rating)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
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
