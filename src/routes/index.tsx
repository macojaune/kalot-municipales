import { useClerk, useUser } from '@clerk/clerk-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { LogOut, User } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Layout } from '../components/Layout'
import { EqualizerBars } from '../components/soundsystem/EqualizerBars'
import { NeonButton } from '../components/soundsystem/NeonButton'
import { ScrollingTicker } from '../components/soundsystem/ScrollingTicker'
import { trackEvent } from '../lib/analytics'
import { buildSeo } from '../lib/seo'
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
} from '../lib/kalot-client'

const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

export const Route = createFileRoute('/')({
  head: () =>
    buildSeo({
      title: 'Vote pour la meilleure musique de campagne',
      description:
        'Découvre les duels KalotMunicipales, vote pour les meilleures musiques de campagne 2026 et consulte le classement en direct.',
      path: '/',
    }),
  component: HomePage,
})

function HomePage() {
  if (!clerkEnabled) {
    return <HomePageContent />
  }

  return <AuthenticatedHomePage />
}

function AuthenticatedHomePage() {
  const navigate = useNavigate()
  const { openSignIn, signOut } = useClerk()
  const { user } = useUser()
  return (
    <HomePageContent
      user={user}
      onOpenSignIn={() =>
        openSignIn({
          fallbackRedirectUrl: window.location.href,
        })
      }
      onSignOut={() => signOut({ redirectUrl: '/' })}
      navigate={navigate}
    />
  )
}

type HomePageContentProps = {
  user?: ReturnType<typeof useUser>['user'] | null
  onOpenSignIn?: () => void
  onSignOut?: () => void
  navigate?: ReturnType<typeof useNavigate>
}

function HomePageContent({
  user = null,
  onOpenSignIn,
  onSignOut,
  navigate,
}: HomePageContentProps = {}) {
  const safeNavigate = useNavigate()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement | null>(null)

  const externalUserId = getExternalUserId(user)
  const displayName = getDisplayName(user)

  useEffect(() => {
    if (!isUserMenuOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isUserMenuOpen])

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

  const electionRound: ElectionRound | 'closed' =
    songs.at(0)?.electionRound ?? 'round1'

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
      await (navigate ?? safeNavigate)({ to: '/duel' })
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
    trackEvent('home_start_vote_click', {
      electionRound,
      isAuthenticated: Boolean(externalUserId),
    })

    if (electionRound === 'closed') {
      setFeedback('Le vote est termine.')
      return
    }

    if (!externalUserId) {
      trackEvent('home_vote_requires_signin', {
        electionRound,
      })
      if (onOpenSignIn) {
        setFeedback(null)
        onOpenSignIn()
      } else {
        setFeedback('Connexion indisponible pour le moment.')
      }
      return
    }

    void startSessionMutation.mutate()
  }

  return (
    <Layout hideHeader>
      <div className="relative flex min-h-screen w-full flex-col items-center justify-around overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_46%,rgba(57,255,20,0.09),transparent_44%)]" />
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.035),transparent_38%)]" />
        <div className="absolute inset-0 pointer-events-none opacity-[0.24] bg-[radial-gradient(circle_at_4px_4px,rgba(255,255,255,0.22)_1.5px,transparent_1.6px),radial-gradient(circle_at_14px_14px,rgba(255,255,255,0.18)_1.5px,transparent_1.6px)] bg-[length:20px_20px]" />

        {user ? (
          <div ref={userMenuRef} className="absolute left-4 top-4 z-30">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((current) => !current)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/35 bg-card/85 text-white shadow-[4px_4px_0_rgba(57,255,20,0.18)] transition-all hover:border-primary hover:text-primary"
              aria-label="Ouvrir le menu utilisateur"
              aria-expanded={isUserMenuOpen}
            >
              <User className="h-5 w-5" />
            </button>

            {isUserMenuOpen ? (
              <div className="absolute left-0 top-14 w-52 rounded-xl border border-primary/35 bg-background/95 p-2 shadow-[6px_6px_0_rgba(0,0,0,0.45)] backdrop-blur-md">
                <div className="border-b border-border px-3 py-2">
                  <p className="truncate font-display text-sm font-bold text-white">
                    {displayName}
                  </p>
                  <p className="text-xs font-body text-muted-foreground">
                    Menu utilisateur
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    onSignOut?.()
                  }}
                  className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-body text-sm text-white transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <LogOut className="h-4 w-4" />
                  Deconnexion
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="z-10 mt-auto space-y-8 px-4 animate-fade-in md:pt-24 md:pb-10">
          <section className="space-y-6 text-center">
            <h1 className="text-6xl font-display font-bold leading-[0.9] text-foreground md:text-8xl">
              <span className="text-glow-white">KALOT</span>
              <br />
              <span className="text-primary text-glow-green">MUNICIPALES</span>
            </h1>
            <p className="mx-auto max-w-[19rem] font-body text-base leading-relaxed text-white md:max-w-xl md:text-lg">
              Vote pour la meilleure musique de campagne des municipales 2026.
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
                : 'Lancer le vote'}
            </NeonButton>

            <Link
              to="/classement"
              onClick={() => {
                trackEvent('home_classement_click')
              }}
              className="relative z-10 inline-flex min-h-14 w-full items-center justify-center whitespace-nowrap rounded-[4px] border-2 border-secondary bg-transparent px-6 py-3 font-display text-[1.55rem] font-bold tracking-[0.08em] text-secondary transition-all duration-300 hover:bg-secondary hover:text-background hover:box-glow-blue active:scale-[0.97]"
            >
              Classement général
            </Link>

            <div className="text-center">
              <Link
                to="/ajouter-son"
                onClick={() => {
                  trackEvent('home_add_track_click')
                }}
                className="relative z-10 inline-flex text-sm font-display tracking-[0.12em] text-muted-foreground underline decoration-primary/50 underline-offset-4 transition-colors hover:text-primary"
              >
                Ajouter un son de campagne
              </Link>
            </div>
          </section>

          {feedback ? (
            <p aria-live="polite" className="text-center font-body text-sm text-accent">
              {feedback}
            </p>
          ) : null}

          <p className="text-center text-xs font-body text-accent">
            Politisé avec <span className="mr-1">🫶</span> par{' '}
            <a
              href="https://marvinl.com"
              className="font-semibold text-glow-white text-white"
            >
              Marvinl.com
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

      </div>
    </Layout>
  )
}
