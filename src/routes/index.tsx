import { useClerk, useUser } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, LogOut, Trophy, User } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LeaderboardTrackList } from '../components/LeaderboardTrackList'
import { Layout } from '../components/Layout'
import { useLeaderboardAudioPlayer } from '../hooks/useLeaderboardAudioPlayer'
import { trackEvent } from '../lib/analytics'
import { useRegionPath, useResolvedRegion } from '../lib/region-routing'
import { buildSeo } from '../lib/seo'
import { getDisplayName, getJson } from '../lib/kalot-client'
import type { LeaderboardResponse } from '../lib/kalot-client'

const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

export const Route = createFileRoute('/')({
  head: () =>
    buildSeo({
      title: 'Classement final des musiques de campagne 2026',
      description:
        'Découvre le top 3 final de Kalot Municipales 2026, écoute les morceaux gagnants et accède au classement complet.',
      path: '/',
    }),
  component: HomePage,
})

export function HomePage() {
  if (!clerkEnabled) {
    return <HomePageContent />
  }

  return <AuthenticatedHomePage />
}

function AuthenticatedHomePage() {
  const { signOut } = useClerk()
  const { user } = useUser()
  const homeHref = useRegionPath('/')
  return (
    <HomePageContent
      user={user}
      onSignOut={() => signOut({ redirectUrl: homeHref })}
    />
  )
}

type HomePageContentProps = {
  user?: ReturnType<typeof useUser>['user'] | null
  onSignOut?: () => void
}

function HomePageContent({
  user = null,
  onSignOut,
}: HomePageContentProps = {}) {
  const classementHref = useRegionPath('/classement')
  const blindtestHref = useRegionPath('/blindtest')
  const resolvedRegion = useResolvedRegion()
  const { playingTrackId, toggleTrack } = useLeaderboardAudioPlayer('home_podium')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement | null>(null)

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
    queryKey: ['leaderboard', 'home-podium', resolvedRegion],
    queryFn: () =>
      getJson<LeaderboardResponse>(
        `/api/leaderboard?limit=3&round=round2${
          resolvedRegion ? `&region=${encodeURIComponent(resolvedRegion)}` : ''
        }`,
      ),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  })

  const songs = useMemo(
    () =>
      Array.isArray(leaderboardQuery.data?.leaderboard)
        ? leaderboardQuery.data.leaderboard
        : [],
    [leaderboardQuery.data?.leaderboard],
  )

  const regionLabel = getRegionLabel(resolvedRegion)
  const title = regionLabel
    ? `Le top 3 final en ${regionLabel}`
    : 'Le top 3 final'
  const intro = regionLabel
    ? 'Le vote est terminé. Voici les trois morceaux qui terminent en tête dans votre territoire.'
    : 'Le vote est terminé. Voici les trois morceaux qui terminent en tête du classement final.'

  return (
    <Layout hideHeader>
      <div className="relative flex min-h-screen w-full flex-col items-center overflow-hidden">
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

        <div className="z-10 w-full max-w-5xl px-4 pb-10 pt-24 animate-fade-in md:pb-14">
          <section className="mb-8 space-y-4 text-center md:mb-10">
            <h1 className="text-6xl font-display font-bold leading-[0.9] text-foreground md:text-8xl">
              <span className="text-glow-white">KALOT</span>
              <br />
              <span className="text-primary text-glow-green">MUNICIPALES</span>
            </h1>
          </section>

          <section className="mx-auto max-w-4xl rounded-[2rem] border border-border bg-card/78 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.4)] backdrop-blur-md md:p-8">
            <div className="space-y-8">
              <div className="space-y-5 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent/45 bg-accent/10 px-4 py-2 text-xs font-body font-semibold uppercase tracking-[0.16em] text-accent shadow-[0_0_18px_rgba(255,107,53,0.14)]">
                  <Trophy className="h-3.5 w-3.5" />
                  Résultats finaux 2026
                </div>
                <div className="space-y-3">
                  <h1 className="font-display text-4xl leading-[0.95] text-foreground md:text-6xl">
                    {title}
                  </h1>
                  <p className="mx-auto max-w-2xl font-body text-sm leading-relaxed text-muted-foreground md:text-base">
                    {intro}
                  </p>
                </div>
              </div>

              {songs.length > 0 ? (
                <LeaderboardTrackList
                  songs={songs}
                  playingTrackId={playingTrackId}
                  onToggleTrack={toggleTrack}
                  variant="top3"
                />
              ) : (
                <div className="rounded-2xl border border-border bg-background/45 px-5 py-8 text-center text-sm text-muted-foreground md:text-base">
                  Le classement final n&apos;est pas encore disponible.
                </div>
              )}

              <div className="space-y-4 text-center">
                <div className="space-y-1">
                  <p className="font-display text-lg text-foreground md:text-xl">
                    Voir le classement complet
                  </p>
                  <p className="font-body text-sm text-muted-foreground">
                    Classement global, par tour et par commune.
                  </p>
                </div>
                <Link
                  to={classementHref}
                  onClick={() => {
                    trackEvent('home_classement_click', {
                      hasRegion: Boolean(resolvedRegion),
                    })
                  }}
                  className="relative z-10 inline-flex min-h-12 items-center justify-center gap-2 rounded-[4px] border-2 border-secondary bg-transparent px-6 py-3 font-display text-base font-bold tracking-[0.08em] text-secondary transition-all duration-300 hover:bg-secondary hover:text-background hover:box-glow-blue active:scale-[0.97]"
                >
                  Voir le classement complet
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          <section className="mx-auto mt-8 max-w-3xl text-center">
            <p className="font-body text-sm leading-relaxed text-muted-foreground md:text-base">
              Merci à toutes les personnes qui ont participé, proposé, écouté et
              partagé cette édition 2026 de Kalot Municipales. Le vote est
              maintenant terminé, mais rendez-vous bientôt pour le prochain
              projet.
            </p>
          </section>

          <section className="mx-auto mt-8 max-w-3xl rounded-[1.8rem] border border-primary/20 bg-background/45 p-5 text-center shadow-[0_18px_50px_rgba(0,0,0,0.28)] md:p-6">
            <div className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-body font-semibold uppercase tracking-[0.16em] text-primary">
              Bonus
            </div>
            <h2 className="mt-4 font-display text-2xl text-foreground md:text-3xl">
              Jouer à IA ou pas IA
            </h2>
            <p className="mx-auto mt-3 max-w-xl font-body text-sm text-muted-foreground md:text-base">
              Les municipales sont finies, mais tu peux encore tester ton
              oreille sur notre blindtest.
            </p>
            <Link
              to={blindtestHref}
              onClick={() => {
                trackEvent('home_blindtest_click', {
                  hasRegion: Boolean(resolvedRegion),
                })
              }}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[4px] border border-primary/45 bg-primary/10 px-5 py-2.5 font-display text-sm tracking-[0.1em] text-primary transition-all duration-300 hover:bg-primary hover:text-background hover:box-glow-green active:scale-[0.97]"
            >
              Lancer le jeu
            </Link>
          </section>

          <p className="mt-8 text-center text-xs font-body text-accent">
            Politisé avec <span className="mr-1">🫶</span> par{' '}
            <a
              href="https://marvinl.com"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-glow-white text-white"
            >
              Marvinl.com
            </a>
          </p>
        </div>
      </div>
    </Layout>
  )
}

function getRegionLabel(region: ReturnType<typeof useResolvedRegion>) {
  if (region === 'guadeloupe') {
    return 'Guadeloupe'
  }

  if (region === 'martinique') {
    return 'Martinique'
  }

  if (region === 'guyane') {
    return 'Guyane'
  }

  return null
}
