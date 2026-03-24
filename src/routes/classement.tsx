import { useClerk, useUser } from '@clerk/clerk-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import { LeaderboardTrackList } from '../components/LeaderboardTrackList'
import { useLeaderboardAudioPlayer } from '../hooks/useLeaderboardAudioPlayer'
import { trackEvent } from '../lib/analytics'
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
import { useRegionPath, useResolvedRegion } from '../lib/region-routing'
import { buildSeo } from '../lib/seo'
import clsx from 'clsx'

const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

export const Route = createFileRoute('/classement')({
  validateSearch: (search: Record<string, unknown>) => ({
    commune:
      typeof search.commune === 'string' && search.commune.trim().length > 0
        ? search.commune
        : undefined,
    round:
      search.round === 'round1' || search.round === 'round2'
        ? search.round
        : undefined,
  }),
  head: () =>
    buildSeo({
      title: 'Classement general des sons de campagne',
      description:
        'Consulte le classement général KalotMunicipales et découvre les morceaux de campagne les mieux notés.',
      path: '/classement',
    }),
  component: LeaderboardRoutePage,
})

function LeaderboardRoutePage() {
  const search = Route.useSearch()

  return (
    <LeaderboardPage
      initialCommuneSlug={search.commune ?? ''}
      initialRound={search.round}
    />
  )
}

type LeaderboardPageProps = {
  initialCommuneSlug?: string
  initialRound?: ElectionRound
}

export function LeaderboardPage({
  initialCommuneSlug = '',
  initialRound,
}: LeaderboardPageProps = {}) {
  if (!clerkEnabled) {
    return (
      <LeaderboardPageContent
        initialCommuneSlug={initialCommuneSlug}
        initialRound={initialRound}
      />
    )
  }

  return (
    <AuthenticatedLeaderboardPage
      initialCommuneSlug={initialCommuneSlug}
      initialRound={initialRound}
    />
  )
}

function AuthenticatedLeaderboardPage({
  initialCommuneSlug = '',
  initialRound,
}: LeaderboardPageProps) {
  const navigate = useNavigate()
  const { openSignIn } = useClerk()
  const { user } = useUser()

  return (
    <LeaderboardPageContent
      user={user}
      navigate={navigate}
      initialCommuneSlug={initialCommuneSlug}
      initialRound={initialRound}
      onOpenSignIn={() =>
        openSignIn({
          fallbackRedirectUrl: window.location.href,
        })
      }
    />
  )
}

type LeaderboardPageContentProps = {
  user?: ReturnType<typeof useUser>['user'] | null
  navigate?: ReturnType<typeof useNavigate>
  initialCommuneSlug?: string
  initialRound?: ElectionRound
  onOpenSignIn?: () => void
}

function LeaderboardPageContent({
  user = null,
  navigate,
  initialCommuneSlug = '',
  initialRound,
  onOpenSignIn,
}: LeaderboardPageContentProps = {}) {
  const classementHref = useRegionPath('/classement')
  const duelHref = useRegionPath('/duel')
  const resolvedRegion = useResolvedRegion()
  const { playingTrackId, toggleTrack } = useLeaderboardAudioPlayer('classement')
  const [feedback, setFeedback] = useState<string | null>(null)
  const safeNavigate = useNavigate()

  const externalUserId = getExternalUserId(user)
  const displayName = getDisplayName(user)
  const selectedCommuneSlug =
    initialRound === 'round2' ? '' : initialCommuneSlug

  const leaderboardQuery = useQuery({
    queryKey: [
      'leaderboard',
      'full-table',
      resolvedRegion,
      selectedCommuneSlug,
      initialRound ?? 'auto',
    ],
    queryFn: () =>
      getJson<LeaderboardResponse>(
        `/api/leaderboard?limit=500${
          resolvedRegion ? `&region=${encodeURIComponent(resolvedRegion)}` : ''
        }${initialRound ? `&round=${encodeURIComponent(initialRound)}` : ''}${
          selectedCommuneSlug
            ? `&commune=${encodeURIComponent(selectedCommuneSlug)}`
            : ''
        }`,
      ),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  })

  const voteOptionsQuery = useQuery({
    queryKey: ['vote-options', resolvedRegion],
    queryFn: () =>
      getJson<VotingStartOptionsResponse>(
        `/api/vote/options${
          resolvedRegion ? `?region=${encodeURIComponent(resolvedRegion)}` : ''
        }`,
      ),
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  })

  const songs = useMemo(
    () =>
      Array.isArray(leaderboardQuery.data?.leaderboard)
        ? leaderboardQuery.data.leaderboard
        : [],
    [leaderboardQuery.data?.leaderboard],
  )

  const eligibleCommunes =
    voteOptionsQuery.data?.ok &&
    Array.isArray(voteOptionsQuery.data.eligibleCommunes)
      ? voteOptionsQuery.data.eligibleCommunes
      : []

  const selectedCommune =
    eligibleCommunes.find((commune) => commune.slug === selectedCommuneSlug) ??
    null

  const activeRound: ElectionRound =
    songs.at(0)?.electionRound ??
    initialRound ??
    (voteOptionsQuery.data?.electionRound === 'round1' ||
    voteOptionsQuery.data?.electionRound === 'round2'
      ? voteOptionsQuery.data.electionRound
      : 'round2')

  const classementTitle = selectedCommune
    ? 'Classement par commune'
    : 'Classement general'

  const electionRound: ElectionRound | 'closed' =
    songs.at(0)?.electionRound ??
    (voteOptionsQuery.data?.electionRound === 'closed' ? 'closed' : activeRound)

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      if (!externalUserId) {
        throw new Error('Utilisateur non connecté.')
      }

      return postJson<StartSessionResponse>('/api/vote/start', {
        externalUserId,
        username: displayName,
        communeSlug: selectedCommuneSlug || null,
        region: resolvedRegion ?? null,
      })
    },
    onSuccess: async (response) => {
      if (!response.ok) {
        setFeedback(response.message)
        return
      }

      setActiveSessionId(response.sessionId, resolvedRegion)
      setFeedback(null)
      await (navigate ?? safeNavigate)({ to: duelHref })
    },
    onError: (error) => {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Impossible de lancer un duel.',
      )
    },
  })

  function handleVoteStart() {
    trackEvent('classement_vote_cta_click', {
      electionRound,
      isAuthenticated: Boolean(externalUserId),
      communeSlug: selectedCommuneSlug || null,
    })

    if (electionRound === 'closed') {
      setFeedback('Le vote est terminé.')
      return
    }

    if (!externalUserId) {
      trackEvent('classement_vote_requires_signin', {
        electionRound,
        communeSlug: selectedCommuneSlug || null,
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
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-6 md:py-8 space-y-5 animate-fade-in">
        <section
          className={clsx(
            'rounded-2xl bg-card/70 p-4 md:p-6',
            activeRound === 'round2'
              ? 'border border-accent/35'
              : 'border border-secondary/35',
          )}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div
                className={clsx(
                  'mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-display tracking-[0.22em]',
                  activeRound === 'round2'
                    ? 'border border-accent/35 bg-accent/10 text-accent'
                    : 'border border-secondary/35 bg-secondary/10 text-secondary',
                )}
              >
                <Trophy className="h-3.5 w-3.5" />
                CLASSEMENTS
              </div>
              <h1
                className={clsx(
                  'flex items-center gap-2 font-display text-3xl',
                  activeRound === 'round2'
                    ? 'text-accent text-glow-orange'
                    : 'text-secondary text-glow-blue',
                )}
              >
                <Trophy className="w-7 h-7" />
                {classementTitle}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-body text-muted-foreground md:text-base">
                Compare le verdict du 1er tour avec la bataille en cours du 2nd
                tour.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-background/45 p-2">
              <button
                type="button"
                onClick={() => {
                  void (navigate ?? safeNavigate)({
                    to: classementHref,
                    search: () => ({
                      ...(selectedCommuneSlug
                        ? { commune: selectedCommuneSlug }
                        : {}),
                      round: 'round1',
                    }),
                    replace: false,
                  })
                  trackEvent('classement_round_tab_click', {
                    selectedRound: 'round1',
                  })
                }}
                className={clsx(
                  'min-h-[44px] rounded-xl px-4 py-3 text-left transition-all',
                  activeRound === 'round1'
                    ? 'border border-primary/45 bg-primary/10 text-primary shadow-[0_0_18px_rgba(57,255,20,0.12)]'
                    : 'border border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-card/60 hover:text-foreground',
                )}
              >
                <span className="block font-display text-sm tracking-[0.16em]">
                  1ER TOUR
                </span>
                <span className="block text-[11px] font-body text-current/80">
                  Tous les sons
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  void (navigate ?? safeNavigate)({
                    to: classementHref,
                    search: () => ({ round: 'round2' }),
                    replace: false,
                  })
                  trackEvent('classement_round_tab_click', {
                    selectedRound: 'round2',
                  })
                }}
                className={clsx(
                  'min-h-[44px] rounded-xl px-4 py-3 text-left transition-all',
                  activeRound === 'round2'
                    ? 'border border-accent/45 bg-accent/10 text-accent shadow-[0_0_18px_rgba(255,107,53,0.12)]'
                    : 'border border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-card/60 hover:text-foreground',
                )}
              >
                <span className="block font-display text-sm tracking-[0.16em]">
                  2ND TOUR
                </span>
                <span className="block text-[11px] font-body text-current/80">
                  Gagnants qualifiés
                </span>
              </button>
            </div>
          </div>

          {activeRound === 'round1' && eligibleCommunes.length > 0 ? (
            <div className="mt-4">
              <select
                value={selectedCommuneSlug}
                onChange={(event) => {
                  const communeSlug = event.target.value
                  void (navigate ?? safeNavigate)({
                    to: classementHref,
                    search: () => (communeSlug ? { commune: communeSlug } : {}),
                    replace: false,
                  })
                  trackEvent('classement_commune_filter_change', {
                    communeSlug: communeSlug || null,
                  })
                }}
                className="min-h-[44px] w-full rounded-lg border border-border bg-background/85 p-3 font-body text-sm text-foreground md:max-w-sm"
              >
                <option value="">Toutes les communes</option>
                {eligibleCommunes.map((commune) => (
                  <option key={commune.id} value={commune.slug}>
                    {commune.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </section>

        {songs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card/70 p-8 text-center text-muted-foreground">
            Pas de classement pour le moment.
          </div>
        ) : (
          <LeaderboardTrackList
            songs={songs}
            playingTrackId={playingTrackId}
            onToggleTrack={toggleTrack}
          />
        )}

        <section className="rounded-2xl border border-primary/35 bg-card/80 p-5 text-center neon-panel md:p-6">
          <h2 className="font-display text-xl text-foreground md:text-2xl">
            {activeRound === 'round2'
              ? 'Participe au sprint final du 2nd tour'
              : 'Participe pour faire monter ton champion'}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            {activeRound === 'round2'
              ? 'Les vainqueurs de chaque commune sont maintenant en duel direct. Lance le vote et départage les qualifiés.'
              : 'Le classement bouge selon les duels en cours. Lance le vote et aide ton morceau préféré à remonter.'}
          </p>
          <button
            type="button"
            onClick={handleVoteStart}
            disabled={startSessionMutation.isPending}
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-[4px] border-2 border-primary bg-transparent px-6 py-3 font-display text-base font-bold tracking-[0.08em] text-primary transition-all duration-300 hover:bg-primary hover:text-background hover:box-glow-green active:scale-[0.97]"
          >
            {startSessionMutation.isPending
              ? 'Chargement…'
              : 'Commencer à voter'}
          </button>
        </section>

        {feedback ? (
          <p aria-live="polite" className="text-center text-sm text-accent">
            {feedback}
          </p>
        ) : null}
      </div>
    </Layout>
  )
}
