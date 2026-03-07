import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Music4, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Layout } from '../components/Layout'
import { trackEvent } from '../lib/analytics'
import { getJson, postFormData } from '../lib/kalot-client'

type ElectoralListsResponse =
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

type SubmitTrackResponse =
  | { ok: true }
  | { ok: false; code?: string; message: string }

export const Route = createFileRoute('/ajouter-son')({
  component: SubmitTrackPage,
})

function SubmitTrackPage() {
  const audioInputRef = useRef<HTMLInputElement | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    title: '',
    artistName: '',
    communeName: '',
    electoralListId: '',
  })

  const electoralListsQuery = useQuery({
    queryKey: ['public-electoral-lists'],
    queryFn: () => getJson<ElectoralListsResponse>('/api/electoral-lists'),
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

  const submitTrackMutation = useMutation({
    mutationFn: () => {
      trackEvent('submit_track_attempt', {
        hasTitle: Boolean(form.title.trim()),
        hasArtistName: Boolean(form.artistName.trim()),
        communeName: form.communeName || null,
      })
      const payload = new FormData()
      payload.set('electoralListId', form.electoralListId)
      payload.set('title', form.title)
      payload.set('artistName', form.artistName)

      if (audioFile) {
        payload.set('audio', audioFile)
      }

      return postFormData<SubmitTrackResponse>('/api/track/submit', payload)
    },
    onSuccess: (response) => {
      if (!response.ok) {
        setFeedback(response.message)
        return
      }

      setFeedback(null)
      trackEvent('submit_track_success', {
        communeName: form.communeName || null,
      })
      setIsSubmitted(true)
      setAudioFile(null)
      if (audioInputRef.current) {
        audioInputRef.current.value = ''
      }
      setForm({
        title: '',
        artistName: '',
        communeName: '',
        electoralListId: '',
      })
    },
    onError: () => {
      setFeedback("Impossible d'ajouter le son.")
    },
  })

  if (isSubmitted) {
    return (
      <Layout>
        <div className="relative mx-auto max-w-3xl space-y-6 overflow-hidden px-4 py-8 animate-fade-in md:py-10">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20">
            <div className="h-[28rem] w-[28rem] rounded-full border border-primary/60 animate-ping [animation-duration:2.8s]" />
          </div>

          <section className="relative z-10 space-y-3 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-primary box-glow-green">
              <Music4 className="h-7 w-7" />
            </div>
            <h1 className="font-display text-4xl text-primary text-glow-green md:text-5xl">
              Merci pour le son
            </h1>
            <p className="text-muted-foreground">
              Ta contribution a bien ete recue. Maintenant, va decouvrir les duels
              et voter pour les meilleurs morceaux.
            </p>
          </section>

          <section className="relative z-10 rounded-2xl border border-primary/45 bg-card/80 p-6 text-center box-glow-green md:p-8">
            <p className="font-display text-xs tracking-widest text-primary">
              CONTRIBUTION ENREGISTREE
            </p>
            <h2 className="mt-2 break-words font-display text-4xl text-foreground md:text-5xl">
              SON AJOUTE
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Merci de faire vivre KalotMunicipales avec de nouveaux morceaux de
              campagne.
            </p>
          </section>

          <section className="relative z-10 flex flex-col gap-3">
            <Link
              to="/"
              onClick={() => {
                trackEvent('submit_track_go_vote_click')
              }}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-[4px] border-2 border-primary bg-transparent px-6 py-3 font-display text-base font-bold tracking-[0.08em] text-primary transition-all duration-300 hover:bg-primary hover:text-background hover:box-glow-green active:scale-[0.97]"
            >
              Commencer a voter
            </Link>

            <button
              type="button"
              onClick={() => {
                trackEvent('submit_track_add_another_click')
                setIsSubmitted(false)
              }}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-[4px] border-2 border-secondary bg-transparent px-6 py-3 font-display text-base font-bold tracking-[0.08em] text-secondary transition-all duration-300 hover:bg-secondary hover:text-background hover:box-glow-blue active:scale-[0.97]"
            >
              Ajouter un autre son
            </button>
          </section>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-8 animate-fade-in">
        <section className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-primary box-glow-green">
            <Music4 className="h-6 w-6" />
          </div>
          <h1 className="font-display text-4xl font-black text-primary text-glow-green">
            Ajouter un son
          </h1>
          <p className="font-body text-sm text-muted-foreground">
            Envoie rapidement un morceau de campagne. Choisis la commune, la tete
            de liste, puis ton fichier audio.
          </p>
        </section>

        <section className="space-y-3 rounded-xl border border-primary/35 bg-card/80 p-4 neon-panel">
          <select
            value={form.communeName}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                communeName: event.target.value,
                electoralListId: '',
              }))
            }
            className="min-h-[44px] w-full rounded-lg border border-border bg-background/85 p-3 font-body text-sm"
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
            className="min-h-[44px] w-full rounded-lg border border-border bg-background/85 p-3 font-body text-sm"
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
            placeholder="Titre optionnel"
            className="min-h-[44px] w-full rounded-lg border border-border bg-background/85 p-3 font-body text-sm"
          />

          <input
            value={form.artistName}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                artistName: event.target.value,
              }))
            }
            placeholder="Artiste connu (optionnel)"
            className="min-h-[44px] w-full rounded-lg border border-border bg-background/85 p-3 font-body text-sm"
          />

          {selectedElectoralList ? (
            <div className="space-y-1 rounded-lg border border-border bg-background/60 p-3 text-xs font-body text-muted-foreground">
              <p>
                <span className="text-foreground">Liste:</span>{' '}
                {selectedElectoralList.name}
              </p>
              <p>
                <span className="text-foreground">Tete de liste:</span>{' '}
                {selectedElectoralList.candidateName || 'Non renseignee'}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void submitTrackMutation.mutate()}
            disabled={
              submitTrackMutation.isPending ||
              !form.electoralListId ||
              !audioFile
            }
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border-2 border-primary bg-transparent py-3 font-display font-bold text-primary transition-all hover:bg-primary hover:text-background hover:box-glow-green"
          >
            <Upload className="h-4 w-4" />
            {submitTrackMutation.isPending ? 'Envoi en cours…' : 'Envoyer le son'}
          </button>
        </section>

        <div className="text-center">
          <Link to="/" className="font-display text-sm text-secondary hover:underline">
            Retour a l accueil
          </Link>
        </div>

        {feedback ? (
          <p aria-live="polite" className="text-center text-sm font-body text-accent">
            {feedback}
          </p>
        ) : null}
      </div>
    </Layout>
  )
}
