import { useUser } from '@clerk/clerk-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Lock, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import {
  deleteJson,
  getExternalUserId,
  getJson,
  postJson,
} from '../lib/kalot-client'

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

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

function AdminPage() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const externalUserId = getExternalUserId(user)

  const [feedback, setFeedback] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    artistName: '',
    communeName: '',
    electoralListId: '',
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
    mutationFn: () =>
      postJson<AdminMutationResponse>(
        '/api/admin/track',
        {
          externalUserId,
          electoralListId: form.electoralListId
            ? Number(form.electoralListId)
            : null,
          title: form.title,
          artistName: form.artistName || null,
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
        electoralListId: '',
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
            className="w-full p-3 rounded-lg bg-background/85 border border-border font-body text-sm min-h-[44px]"
          />

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
            disabled={createTrackMutation.isPending || !form.electoralListId}
            className="w-full py-3 rounded-xl border-2 border-primary bg-transparent text-primary font-display font-bold flex items-center justify-center gap-2 min-h-[44px] hover:bg-primary hover:text-background hover:box-glow-green transition-all"
          >
            <Plus className="w-4 h-4" />
            {createTrackMutation.isPending ? 'Ajout…' : 'Ajouter'}
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
