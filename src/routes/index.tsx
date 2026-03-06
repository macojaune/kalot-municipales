import { useUser } from '@clerk/clerk-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import { EqualizerBars } from '../components/soundsystem/EqualizerBars'
import { NeonButton } from '../components/soundsystem/NeonButton'
import { ScrollingTicker } from '../components/soundsystem/ScrollingTicker'
import {
  getDisplayName,
  getExternalUserId,
  getJson,
  postJson,
  setActiveSessionId,
} from '../lib/kalot-client'
import type {
  ElectionRound,
  LeaderboardResponse,
  StartSessionResponse,
  VotingStartOptionsResponse,
} from '../lib/kalot-client'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isCommunePickerOpen, setIsCommunePickerOpen] = useState(false)

  const externalUserId = getExternalUserId(user)
  const displayName = getDisplayName(user)

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', 'home-full'],
    queryFn: () => getJson<LeaderboardResponse>('/api/leaderboard?limit=200'),
    refetchInterval: 15000,
  })

  const votingOptionsQuery = useQuery({
    queryKey: ['vote-options'],
    queryFn: () => getJson<VotingStartOptionsResponse>('/api/vote/options'),
    refetchInterval: 15000,
  })

  const songs = useMemo(
    () =>
      Array.isArray(leaderboardQuery.data?.leaderboard)
        ? leaderboardQuery.data.leaderboard
        : [],
    [leaderboardQuery.data?.leaderboard],
  )

  const topTracks = useMemo(
    () => [...songs].sort((a, b) => b.rating - a.rating).slice(0, 5),
    [songs],
  )

  const electionRound: ElectionRound | 'closed' =
    votingOptionsQuery.data?.electionRound ?? songs.at(0)?.electionRound ?? 'round1'
  const eligibleCommunes = votingOptionsQuery.data?.eligibleCommunes ?? []

  const tickerItems = useMemo(
    () => topTracks.map((track) => `${track.title} - ${track.artistName}`),
    [topTracks],
  )

  const startSessionMutation = useMutation({
    mutationFn: async (communeSlug?: string | null) => {
      if (!externalUserId) {
        throw new Error('Utilisateur non connecte.')
      }

      return postJson<StartSessionResponse>('/api/vote/start', {
        externalUserId,
        username: displayName,
        communeSlug: electionRound === 'round1' ? communeSlug ?? null : null,
      })
    },
    onSuccess: async (response) => {
      if (!response.ok) {
        setFeedback(response.message)
        return
      }

      setActiveSessionId(response.sessionId)
      setFeedback(null)
      setIsCommunePickerOpen(false)
      await navigate({ to: '/duel' })
    },
    onError: (error) => {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Impossible de lancer un duel.',
      )
    },
  })

  function handleStart() {
    if (electionRound === 'closed') {
      setFeedback('Le vote est termine.')
      return
    }

    if (electionRound === 'round1') {
      if (!eligibleCommunes.length) {
        setFeedback('Aucune commune n a encore assez de sons pour un duel.')
        return
      }

      setIsCommunePickerOpen(true)
      setFeedback(null)
      return
    }

    void startSessionMutation.mutate(null)
  }

  function handleCommuneLaunch(communeSlug: string) {
    void startSessionMutation.mutate(communeSlug)
  }

  return (
    <Layout hideHeader>
      <div className="relative flex min-h-screen w-full flex-col items-center justify-around overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_46%,rgba(57,255,20,0.09),transparent_44%)]" />
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.035),transparent_38%)]" />
        <div className="absolute inset-0 pointer-events-none opacity-[0.24] bg-[radial-gradient(circle_at_4px_4px,rgba(255,255,255,0.22)_1.5px,transparent_1.6px),radial-gradient(circle_at_14px_14px,rgba(255,255,255,0.18)_1.5px,transparent_1.6px)] bg-[length:20px_20px]" />

        <div className="z-10 mt-auto space-y-8 px-4 animate-fade-in md:pt-24 md:pb-10">
          <section className="space-y-6 text-center">
            <h1 className="text-6xl font-display font-bold leading-[0.9] text-foreground md:text-8xl">
              <span className="text-glow-white">KALOT</span>
              <br />
              <span className="text-primary text-glow-green">MUNICIPALES</span>
            </h1>
            <p className="mx-auto max-w-[19rem] font-body text-base leading-relaxed text-white md:max-w-xl md:text-lg">
              {electionRound === 'round1'
                ? 'Premier tour: elisez le meilleur son de campagne dans votre commune.'
                : 'Deuxieme tour: les gagnants des communes s affrontent pour la finale.'}
            </p>
          </section>

          <section className="relative mx-auto w-full max-w-2xl space-y-4 pt-5">
            <div className="pointer-events-none absolute left-1/2 top-[-20%] w-[90%] max-w-xl -translate-x-1/2 opacity-[0.14]">
              <EqualizerBars
                barCount={10}
                variant="large"
                color="green"
                className="w-full justify-between"
              />
            </div>

            {electionRound === 'round2' ? (
              <p className="relative z-10 text-center font-display text-xs tracking-widest text-primary">
                Finale des gagnants communaux
              </p>
            ) : null}

            <NeonButton
              color="green"
              size="lg"
              fullWidth
              className="whitespace-nowrap"
              onClick={handleStart}
              disabled={startSessionMutation.isPending}
            >
              {startSessionMutation.isPending
                ? 'Lancement...'
                : electionRound === 'round1'
                  ? 'Lancer le vote'
                  : 'Lancer la finale'}
            </NeonButton>

            <Link
              to="/leaderboard"
              className="relative z-10 inline-flex min-h-14 w-full items-center justify-center whitespace-nowrap rounded-[4px] border-2 border-secondary bg-transparent px-6 py-3 font-display text-[1.55rem] font-bold tracking-[0.08em] text-secondary transition-all duration-300 hover:bg-secondary hover:text-background hover:box-glow-blue active:scale-[0.97]"
            >
              Classement général
            </Link>
          </section>

          {feedback ? (
            <p aria-live="polite" className="text-center font-body text-sm text-accent">
              {feedback}
            </p>
          ) : null}

          <p className="text-center text-xs font-body text-accent">
            politisé avec <span className="mr-1">🫶</span> par{' '}
            <a
              href="https://marvinl.com"
              className="font-semibold text-glow-white text-white"
            >
              marvinl.com
            </a>
          </p>
        </div>

        <div className="relative z-10 mt-auto w-full">
          <div className="mx-auto max-w-6xl border-y border-primary/30 bg-card/70 px-4 py-3">
            <span className="font-display text-lg text-white">
              TOP TRACKS DU MOMENT
            </span>
          </div>
          <ScrollingTicker items={tickerItems} />
        </div>

        {isCommunePickerOpen ? (
          <div className="absolute inset-0 z-30 flex items-end bg-black/70 p-4 backdrop-blur-sm md:items-center md:justify-center">
            <div className="neon-panel box-glow-green w-full max-w-2xl rounded-2xl border border-primary/45 bg-card/95 p-4 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-xs tracking-[0.2em] text-primary">
                    Premier tour
                  </p>
                  <h2 className="mt-2 font-display text-3xl text-glow-green text-primary">
                    Choisis ta commune
                  </h2>
                  <p className="mt-2 max-w-md font-body text-sm text-muted-foreground">
                    On ne te propose que les communes qui ont deja assez de sons
                    pour lancer des duels.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCommunePickerOpen(false)}
                  className="rounded-full border border-border px-3 py-1 font-display text-[11px] tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  Fermer
                </button>
              </div>

              <div className="mt-5 grid max-h-[55vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {eligibleCommunes.map((commune) => (
                  <button
                    key={commune.id}
                    type="button"
                    onClick={() => handleCommuneLaunch(commune.slug)}
                    disabled={startSessionMutation.isPending}
                    className="group rounded-xl border border-border bg-background/80 px-4 py-4 text-left transition-all hover:border-primary hover:bg-primary/10 hover:box-glow-green disabled:opacity-60"
                  >
                    <p className="font-display text-xl text-foreground transition-colors group-hover:text-primary">
                      {commune.name}
                    </p>
                    <p className="mt-1 font-body text-xs text-muted-foreground">
                      {commune.trackCount} sons eligibles
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  )
}
