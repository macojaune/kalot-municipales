import { useClerk, useUser } from '@clerk/clerk-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Pause, Play, Trophy } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Layout } from '../components/Layout'
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
import { buildSeo } from '../lib/seo'
import clsx from 'clsx'

const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

export const Route = createFileRoute('/classement')({
  validateSearch: (search: Record<string, unknown>) => ({
    commune:
      typeof search.commune === 'string' && search.commune.trim().length > 0
        ? search.commune
        : undefined,
  }),
  head: () =>
    buildSeo({
      title: 'Classement general des sons de campagne',
      description:
        'Consulte le classement général KalotMunicipales et découvre les morceaux de campagne les mieux notés.',
      path: '/classement',
    }),
  component: LeaderboardPage,
})

function LeaderboardPage() {
  if (!clerkEnabled) {
    return <LeaderboardPageContent />
  }

  return <AuthenticatedLeaderboardPage />
}

function AuthenticatedLeaderboardPage() {
  const navigate = useNavigate()
  const { openSignIn } = useClerk()
  const { user } = useUser()
  const search = Route.useSearch()

  return (
    <LeaderboardPageContent
      user={user}
      navigate={navigate}
      initialCommuneSlug={search.commune ?? ''}
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
  onOpenSignIn?: () => void
}

function LeaderboardPageContent({
  user = null,
  navigate,
  initialCommuneSlug = '',
  onOpenSignIn,
}: LeaderboardPageContentProps = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const loadedTrackIdRef = useRef<number | null>(null)
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const safeNavigate = useNavigate()
  const search = Route.useSearch()

  const externalUserId = getExternalUserId(user)
  const displayName = getDisplayName(user)
  const selectedCommuneSlug = initialCommuneSlug || search.commune || ''

  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio

    const handlePause = () => {
      setPlayingTrackId((previous) => {
        if (previous === loadedTrackIdRef.current) {
          return null
        }

        return previous
      })
    }

    const handlePlay = () => {
      if (loadedTrackIdRef.current) {
        setPlayingTrackId(loadedTrackIdRef.current)
      }
    }

    const handleEnded = () => {
      setPlayingTrackId(null)
    }

    audio.addEventListener('pause', handlePause)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.pause()
      audio.src = ''
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', 'full-table', selectedCommuneSlug],
    queryFn: () =>
      getJson<LeaderboardResponse>(
        `/api/leaderboard?limit=500${
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
    queryKey: ['vote-options'],
    queryFn: () => getJson<VotingStartOptionsResponse>('/api/vote/options'),
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
    voteOptionsQuery.data?.ok && Array.isArray(voteOptionsQuery.data.eligibleCommunes)
      ? voteOptionsQuery.data.eligibleCommunes
      : []

  const selectedCommune =
    eligibleCommunes.find((commune) => commune.slug === selectedCommuneSlug) ??
    null

  const classementTitle = selectedCommune
    ? `Classement ${selectedCommune.name}`
    : 'Classement general'

  const electionRound: ElectionRound | 'closed' =
    songs.at(0)?.electionRound ?? 'round1'

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      if (!externalUserId) {
        throw new Error('Utilisateur non connecté.')
      }

      return postJson<StartSessionResponse>('/api/vote/start', {
        externalUserId,
        username: displayName,
        communeSlug: selectedCommuneSlug || null,
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
        error instanceof Error ? error.message : 'Impossible de lancer un duel.',
      )
    },
  })

  const getListLabel = (song: (typeof songs)[number]) => {
    return song.listName || null
  }

  const getTrackLabel = (song: (typeof songs)[number]) => {
    const normalizedTitle = song.title.trim().toLowerCase()
    const normalizedCandidateName = song.candidateName?.trim().toLowerCase()
    const normalizedListName = song.listName?.trim().toLowerCase()
    const normalizedCommuneName = song.communeName.trim().toLowerCase()
    const generatedArtistTitle =
      song.artistName.trim() && song.communeName.trim()
        ? `${song.artistName.trim()} - ${song.communeName.trim()}`.toLowerCase()
        : null

    const hasCustomTrackTitle =
      normalizedTitle.length > 0 &&
      normalizedTitle !== normalizedCandidateName &&
      normalizedTitle !== normalizedListName &&
      normalizedTitle !== normalizedCommuneName &&
      normalizedTitle !== 'son de campagne' &&
      normalizedTitle !== generatedArtistTitle

    if (hasCustomTrackTitle && song.candidateName) {
      return `${song.title} - ${song.candidateName}`
    }

    if (song.candidateName) {
      return song.candidateName
    }

    return song.title
  }

  function toggleTrack(song: (typeof songs)[number]) {
    if (!song.streamUrl) {
      return
    }

    const audio = audioRef.current
    if (!audio) {
      return
    }

    if (loadedTrackIdRef.current === song.id) {
      if (playingTrackId === song.id) {
        trackEvent('classement_track_pause', {
          trackId: song.id,
          rank: song.rank,
          communeName: song.communeName,
        })
        audio.pause()
      } else {
        trackEvent('classement_track_play', {
          trackId: song.id,
          rank: song.rank,
          communeName: song.communeName,
        })
        void audio.play()
      }
      return
    }

    audio.pause()
    audio.src = song.streamUrl
    loadedTrackIdRef.current = song.id
    setPlayingTrackId(song.id)
    trackEvent('classement_track_play', {
      trackId: song.id,
      rank: song.rank,
      communeName: song.communeName,
    })
    void audio.play().catch(() => {
      setPlayingTrackId(null)
      trackEvent('classement_track_play_failed', {
        trackId: song.id,
        rank: song.rank,
        communeName: song.communeName,
      })
    })
  }

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
        <section className="rounded-2xl border border-secondary/35 bg-card/70 p-4 md:p-6">
          <h1 className="font-display text-3xl text-secondary text-glow-blue flex items-center gap-2">
            <Trophy className="w-7 h-7" />
            {classementTitle}
          </h1>
          {eligibleCommunes.length > 0 ? (
            <div className="mt-4">
              <select
                value={selectedCommuneSlug}
                onChange={(event) => {
                  const communeSlug = event.target.value
                  void (navigate ?? safeNavigate)({
                    to: '/classement',
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
          <section className="space-y-3">
            {songs.map((song, index) => {
              const medalColor =
                index === 0
                  ? 'text-primary text-glow-green'
                  : index === 1
                    ? 'text-secondary text-glow-blue'
                    : index === 2
                      ? 'text-accent text-glow-orange'
                      : 'text-muted-foreground'

              const borderTone =
                index === 0
                  ? 'border-primary/45 box-glow-green'
                  : index === 1
                    ? 'border-secondary/45 box-glow-blue'
                    : index === 2
                      ? 'border-accent/45 box-glow-orange'
                      : 'border-border'

              return (
                <div
                  key={song.id}
                  className={`neon-panel relative overflow-hidden rounded-xl border px-4 py-3 md:py-4 flex items-center gap-3 ${borderTone}`}
                >
                  <div className={`w-8 text-center font-display text-2xl ${medalColor}`}>
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-row items-baseline gap-2 md:gap-4">
                      <p className="min-w-0 flex-1 font-display text-xl font-semibold text-foreground truncate">
                        {getTrackLabel(song)}
                      </p>
                      <span
                        className={clsx([
                          "max-w-[8rem] shrink truncate text-[11px] md:max-w-none md:text-sm",
                          medalColor,
                        ])}
                      >
                        {song.communeName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 truncate text-sm text-muted-foreground">
                        {getListLabel(song)}
                      </p>
                      {song.isAiGenerated ? (
                        <span className="shrink-0 rounded-full border border-secondary/35 bg-secondary/10 px-2 py-0.5 font-body text-[11px] font-semibold text-secondary">
                          IA
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleTrack(song)}
                    aria-label={
                      playingTrackId === song.id ? 'Mettre en pause' : 'Ecouter le morceau'
                    }
                    disabled={!song.streamUrl}
                    className={`play-orb inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-background transition-all active:scale-95 ${
                      index === 0
                        ? 'border-primary bg-primary shadow-[0_0_14px_rgba(57,255,20,0.38)]'
                        : index === 1
                          ? 'border-secondary bg-secondary shadow-[0_0_14px_rgba(0,180,216,0.34)]'
                          : index === 2
                            ? 'border-accent bg-accent shadow-[0_0_14px_rgba(255,107,53,0.34)]'
                            : 'border-border bg-muted text-foreground'
                    } ${playingTrackId === song.id ? 'is-playing' : ''} ${
                      !song.streamUrl ? 'cursor-not-allowed opacity-40' : ''
                    }`}
                  >
                    {playingTrackId === song.id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 translate-x-0.5" />
                    )}
                  </button>

                  <div className="text-right shrink-0">
                    <p className="tabular font-display text-base text-foreground md:text-xl">
                      {Math.round(song.rating)}
                    </p>
                    <p className="text-[9px] font-display text-muted-foreground tracking-widest md:text-[10px]">
                      PTS
                    </p>
                  </div>
                </div>
              )
            })}
          </section>
        )}

        <section className="rounded-2xl border border-primary/35 bg-card/80 p-5 text-center neon-panel md:p-6">
          <h2 className="font-display text-xl text-foreground md:text-2xl">
            Participe pour faire monter ton champion
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Le classement bouge selon les duels en cours. Lance le vote et aide ton
            morceau préféré à remonter.
          </p>
          <button
            type="button"
            onClick={handleVoteStart}
            disabled={startSessionMutation.isPending}
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-[4px] border-2 border-primary bg-transparent px-6 py-3 font-display text-base font-bold tracking-[0.08em] text-primary transition-all duration-300 hover:bg-primary hover:text-background hover:box-glow-green active:scale-[0.97]"
          >
            {startSessionMutation.isPending ? 'Chargement…' : 'Commencer à voter'}
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
