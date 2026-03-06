import { useUser } from '@clerk/clerk-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import { EqualizerBars } from '../components/soundsystem/EqualizerBars'
import { NeonButton } from '../components/soundsystem/NeonButton'
import { ScrollingTicker } from '../components/soundsystem/ScrollingTicker'
import {
  getActiveSessionId,
  getDisplayName,
  getExternalUserId,
  getJson,
  postJson,
  setActiveSessionId,
} from '../lib/kalot-client'
import type {
  LeaderboardResponse,
  StartSessionResponse,
} from '../lib/kalot-client'
import { Heart } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const [feedback, setFeedback] = useState<string | null>(null)

  const externalUserId = getExternalUserId(user)
  const displayName = getDisplayName(user)

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', 'home-full'],
    queryFn: () => getJson<LeaderboardResponse>('/api/leaderboard?limit=200'),
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

  const tickerItems = useMemo(
    () => topTracks.map((track) => `${track.title} - ${track.artistName}`),
    [topTracks],
  )

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      if (!externalUserId) {
        throw new Error('Utilisateur non connecte.')
      }

      return postJson<StartSessionResponse>('/api/vote/start', {
        externalUserId,
        username: displayName,
      })
    },
    onSuccess: async (response) => {
      if (!response.ok) {
        setFeedback(response.message)
        return
      }

      setActiveSessionId(response.sessionId)
      setFeedback(null)
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
    const existingSessionId = getActiveSessionId()
    if (existingSessionId) {
      setFeedback(null)
      void navigate({ to: '/duel' })
      return
    }

    void startSessionMutation.mutate()
  }

  return (
    <Layout hideHeader>
      <div className="relative min-h-screen overflow-hidden flex flex-col justify-around items-center w-full">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_46%,rgba(57,255,20,0.09),transparent_44%)]" />
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.035),transparent_38%)]" />

        <div className="absolute inset-0 pointer-events-none opacity-[0.24] bg-[radial-gradient(circle_at_4px_4px,rgba(255,255,255,0.22)_1.5px,transparent_1.6px),radial-gradient(circle_at_14px_14px,rgba(255,255,255,0.18)_1.5px,transparent_1.6px)] bg-[length:20px_20px]" />



        <div className="z-10 px-4 md:pt-24 md:pb-10 space-y-8 animate-fade-in  flex-0 mt-auto">
          <section className="text-center space-y-6">
            <h1 className="text-6xl md:text-8xl font-display font-bold text-foreground leading-[0.9] ">
              <span className="text-glow-white">KALÒT</span>
              <br />
              <span className="text-primary text-glow-green">MUNICIPALES</span>
            </h1>
            <p className="mx-auto max-w-[19rem] md:max-w-xl text-white font-body text-base md:text-lg leading-relaxed">
              Vote pour la meilleure musique de campagne des municipales 2026.
            </p>
          </section>

          <section className="mx-auto w-full max-w-2xl space-y-4 pt-5 relative">
            <div className="absolute left-1/2 top-[-20%] -translate-x-1/2 w-[90%] max-w-xl pointer-events-none opacity-[0.14]">
              <EqualizerBars
                barCount={10}
                variant="large"
                color="green"
                className="w-full justify-between"
              />
            </div>
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
                : 'Démarrer'}
            </NeonButton>
            <Link
              to="/leaderboard"
              className="relative z-10 inline-flex min-h-14 w-full items-center justify-center rounded-[4px] border-2 border-secondary bg-transparent px-6 py-3 font-display text-[1.55rem] font-bold tracking-[0.08em] text-secondary transition-all duration-300 hover:bg-secondary hover:text-background hover:box-glow-blue active:scale-[0.97] whitespace-nowrap"
            >
              Classement général
            </Link>
          </section>

          {feedback ? (
            <p aria-live="polite" className="text-sm text-center text-accent font-body">
              {feedback}
            </p>
          ) : null}
          <p className="text-xs text-center text-accent font-body">
            Politisé avec <span className="mr-1">🫶</span> par <a href='https://marvinl.com' className='text-glow-white text-white font-semibold'>MarvinL.com</a>
          </p>
        </div>

        <div className="relative z-10 mt-auto w-full">
          <div className="mx-auto max-w-6xl px-4 py-3 border-y border-primary/30 bg-card/70">
            <span className="font-display text-lg text-white">
              TOP TRACKS DU MOMENT
            </span>
          </div>
          <ScrollingTicker items={tickerItems} />
        </div>
      </div>
    </Layout>
  )
}
