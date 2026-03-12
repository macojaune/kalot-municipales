import { useClerk, useUser } from '@clerk/clerk-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Music2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BlindtestCard } from '../components/BlindtestCard'
import { Layout } from '../components/Layout'
import { NeonButton } from '../components/soundsystem/NeonButton'
import { trackEvent } from '../lib/analytics'
import { useRegionPath } from '../lib/region-routing'
import { buildSeo } from '../lib/seo'
import {
  clearBlindtestSessionId,
  getBlindtestSessionId,
  getDisplayName,
  getExternalUserId,
  getJson,
  postJson,
  setBlindtestSummary,
  type BlindtestSessionStateResponse,
  type BlindtestTrack,
  type BlindtestTrackStats,
  type StartBlindtestSessionResponse,
  type SubmitBlindtestAnswerResponse,
} from '../lib/kalot-client'

const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

type RevealState = {
  userGuess: 'ai' | 'human'
  actualLabel: 'ai' | 'human'
  isCorrect: boolean
  stats: BlindtestTrackStats
}

export const Route = createFileRoute('/blindtest')({
  head: () =>
    buildSeo({
      title: 'Blindtest IA',
      description:
        "Écoute un morceau de campagne et essaie de deviner s'il a été généré par IA.",
      path: '/blindtest',
      robots: 'noindex,nofollow',
    }),
  component: BlindtestPage,
})

export function BlindtestPage() {
  if (!clerkEnabled) {
    return <BlindtestPageContent />
  }

  return <AuthenticatedBlindtestPage />
}

function AuthenticatedBlindtestPage() {
  const { openSignIn } = useClerk()
  const { user } = useUser()

  return (
    <BlindtestPageContent
      user={user}
      onOpenSignIn={() =>
        openSignIn({
          fallbackRedirectUrl: window.location.href,
        })
      }
    />
  )
}

type BlindtestPageContentProps = {
  user?: ReturnType<typeof useUser>['user'] | null
  onOpenSignIn?: () => void
}

function BlindtestPageContent({
  user = null,
  onOpenSignIn,
}: BlindtestPageContentProps = {}) {
  const navigate = useNavigate()
  const homeHref = useRegionPath('/')
  const blindtestResultsHref = useRegionPath('/blindtest/resultats')
  const externalUserId = getExternalUserId(user)
  const displayName = getDisplayName(user)

  const [sessionId, setSessionId] = useState<string | null>(() => {
    const storedSessionId = getBlindtestSessionId()
    if (storedSessionId) {
      clearBlindtestSessionId()
    }

    return storedSessionId
  })
  const [track, setTrack] = useState<BlindtestTrack | null>(null)
  const [currentRound, setCurrentRound] = useState(1)
  const [totalRounds, setTotalRounds] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [reveal, setReveal] = useState<RevealState | null>(null)
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null)
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0)
  const [playbackDuration, setPlaybackDuration] = useState(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const loadedTrackIdRef = useRef<number | null>(null)
  const pendingSeekTimeRef = useRef(0)
  const bootstrapRef = useRef(false)
  const transitionTimeoutRef = useRef<number | null>(null)
  const pendingResponseRef = useRef<SubmitBlindtestAnswerResponse | null>(null)

  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio

    const updatePlaybackState = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0
      setPlaybackCurrentTime(audio.currentTime)
      setPlaybackDuration(duration)
    }

    const handleLoadedMetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0
      const seekTarget = Math.max(
        0,
        Math.min(pendingSeekTimeRef.current, duration),
      )
      if (seekTarget > 0) {
        audio.currentTime = seekTarget
      }
      pendingSeekTimeRef.current = 0
      setPlaybackCurrentTime(audio.currentTime)
      setPlaybackDuration(duration)
    }

    const handlePause = () => {
      setPlayingTrackId((previous) =>
        previous === loadedTrackIdRef.current ? null : previous,
      )
      updatePlaybackState()
    }

    const handlePlay = () => {
      if (loadedTrackIdRef.current) {
        setPlayingTrackId(loadedTrackIdRef.current)
      }
    }

    const handleEnded = () => {
      setPlayingTrackId(null)
      updatePlaybackState()
    }

    audio.addEventListener('timeupdate', updatePlaybackState)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('ended', handleEnded)

    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current)
      }

      audio.pause()
      audio.removeEventListener('timeupdate', updatePlaybackState)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  useEffect(() => {
    if (!track) {
      return
    }

    if (loadedTrackIdRef.current !== track.id) {
      audioRef.current?.pause()
      loadedTrackIdRef.current = null
      setPlayingTrackId(null)
      setPlaybackCurrentTime(0)
      setPlaybackDuration(0)
    }
  }, [track])

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!externalUserId) {
        throw new Error('Utilisateur non connecté.')
      }

      return postJson<StartBlindtestSessionResponse>('/api/blindtest/start', {
        externalUserId,
        username: displayName,
      })
    },
    onSuccess: (response) => {
      if (!response.ok) {
        setFeedback(response.message)
        return
      }

      trackEvent('blindtest_session_started', {
        totalRounds: response.totalRounds,
      })
      setSessionId(response.sessionId)
      setTrack(response.track)
      setCurrentRound(response.currentRound)
      setTotalRounds(response.totalRounds)
      setReveal(null)
      setFeedback(null)
    },
    onError: (error) => {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Impossible de lancer le blindtest.',
      )
    },
  })

  const stateQuery = useQuery({
    queryKey: ['blindtest-state', sessionId],
    queryFn: () =>
      getJson<BlindtestSessionStateResponse>(
        `/api/blindtest/state?sessionId=${sessionId}`,
      ),
    enabled: Boolean(sessionId) && !track,
    staleTime: 0,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (bootstrapRef.current || sessionId || !externalUserId) {
      return
    }

    bootstrapRef.current = true
    void startMutation.mutate()
  }, [externalUserId, sessionId, startMutation])

  useEffect(() => {
    const payload = stateQuery.data

    if (!payload || !payload.ok) {
      return
    }

    if (payload.status === 'completed') {
      setBlindtestSummary(payload.summary)
      void navigate({ to: blindtestResultsHref })
      return
    }

    setTrack(payload.track)
    setCurrentRound(payload.currentRound)
    setTotalRounds(payload.totalRounds)
    setFeedback(null)
  }, [navigate, stateQuery.data])

  const answerMutation = useMutation({
    mutationFn: async ({
      guessLabel,
      source,
    }: {
      guessLabel: 'ai' | 'human'
      source: 'button' | 'swipe'
    }) => {
      if (!sessionId || !track) {
        throw new Error('Blindtest indisponible.')
      }

      trackEvent('blindtest_answer_submitted', {
        trackId: track.id,
        guessLabel,
        source,
        round: currentRound,
        totalRounds,
      })

      if (source === 'swipe') {
        trackEvent('blindtest_swipe_used', {
          guessLabel,
          round: currentRound,
        })
      }

      return postJson<SubmitBlindtestAnswerResponse>('/api/blindtest/answer', {
        sessionId,
        trackId: track.id,
        guessLabel,
      })
    },
    onSuccess: (response) => {
      audioRef.current?.pause()
      setPlayingTrackId(null)

      if (!response.ok) {
        setFeedback(response.message)
        return
      }

      setReveal({
        userGuess: response.result.userGuess,
        actualLabel: response.result.actualLabel,
        isCorrect: response.result.isCorrect,
        stats: response.trackStats,
      })
      pendingResponseRef.current = response

      trackEvent(
        response.result.isCorrect
          ? 'blindtest_answer_correct'
          : 'blindtest_answer_wrong',
        {
          trackId: response.result.trackId,
          actualLabel: response.result.actualLabel,
          round: currentRound,
        },
      )

      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current)
      }

      transitionTimeoutRef.current = window.setTimeout(() => {
        void continueToNextStep()
      }, 2600)
    },
    onError: (error) => {
      setFeedback(
        error instanceof Error ? error.message : 'Réponse impossible.',
      )
    },
  })

  async function continueToNextStep() {
    const response = pendingResponseRef.current
    if (!response) {
      return
    }

    pendingResponseRef.current = null

    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current)
      transitionTimeoutRef.current = null
    }

    if (response.status === 'completed') {
      setBlindtestSummary(response.summary)
      clearBlindtestSessionId()
      await navigate({ to: blindtestResultsHref })
      return
    }

    setTrack(response.nextTrack)
    setCurrentRound(response.currentRound)
    setTotalRounds(response.totalRounds)
    setReveal(null)
  }

  function handleStartFromPrompt() {
    if (!externalUserId) {
      onOpenSignIn?.()
      return
    }

    void startMutation.mutate()
  }

  function playTrack() {
    if (!track?.streamUrl) {
      return
    }

    const audio = audioRef.current
    if (!audio) {
      return
    }

    if (loadedTrackIdRef.current === track.id) {
      if (playingTrackId === track.id) {
        audio.pause()
      } else {
        void audio.play().catch(() => {
          setFeedback('Lecture audio indisponible.')
        })
      }
      return
    }

    audio.pause()
    pendingSeekTimeRef.current = playbackCurrentTime
    loadedTrackIdRef.current = track.id
    audio.src = track.streamUrl
    audio.load()
    void audio.play().catch(() => {
      setFeedback('Lecture audio indisponible.')
    })
  }

  function seekTrack(ratio: number) {
    const normalizedRatio = Math.max(0, Math.min(ratio, 1))
    const nextTime = playbackDuration * normalizedRatio

    setPlaybackCurrentTime(nextTime)
    if (loadedTrackIdRef.current === track?.id && audioRef.current) {
      audioRef.current.currentTime = nextTime
    } else {
      pendingSeekTimeRef.current = nextTime
    }
  }

  const isLoading =
    startMutation.isPending ||
    (Boolean(sessionId) && stateQuery.isLoading && !track)

  if (!externalUserId) {
    return (
      <Layout backTo="/">
        <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-8">
          <section className="w-full rounded-[1.8rem] border border-secondary/35 bg-card/85 p-6 text-center shadow-[0_20px_70px_rgba(0,0,0,0.38)]">
            <Music2 className="mx-auto h-10 w-10 text-secondary" />
            <h1 className="mt-4 font-display text-4xl text-secondary text-glow-blue">
              Blindtest IA
            </h1>
            <p className="mt-3 font-body text-sm text-muted-foreground">
              Connecte-toi pour lancer une partie et deviner si le morceau a été
              généré par IA ou non.
            </p>
            <div className="mt-6">
              <NeonButton
                color="blue"
                size="md"
                onClick={handleStartFromPrompt}
              >
                Se connecter
              </NeonButton>
            </div>
          </section>
        </div>
      </Layout>
    )
  }

  return (
    <Layout
      backTo="/"
      headerRight={
        <Link
          to={homeHref}
          className="inline-flex min-h-9 items-center rounded-full border border-border px-3 text-[11px] font-display tracking-widest text-muted-foreground transition-colors hover:border-secondary hover:text-secondary"
        >
          Quitter
        </Link>
      }
    >
      <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden px-4 py-5 md:px-6 md:py-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(0,180,216,0.14),transparent_28%),radial-gradient(circle_at_50%_82%,rgba(255,107,53,0.12),transparent_24%)]" />

        <div className="relative z-10 mx-auto max-w-5xl space-y-6">
          <section className="space-y-2 text-center">
            <p className="font-display text-sm tracking-[0.28em] text-secondary">
              BLINDTEST IA
            </p>
            <h1 className="mx-auto max-w-3xl font-display text-5xl leading-[0.88] text-foreground md:text-7xl">
              Swipe, écoute,
              <span className="ml-3 text-accent text-glow-orange">devine.</span>
            </h1>
            <p className="mx-auto max-w-xl font-body text-sm leading-relaxed text-muted-foreground md:text-base">
              Une seule carte. Un seul extrait à la fois. À toi de sentir si le
              morceau est IA ou pas.
            </p>
          </section>

          {isLoading ? (
            <div className="mx-auto max-w-xl rounded-[1.6rem] border border-secondary/35 bg-card/85 p-8 text-center">
              <p className="font-display text-2xl text-secondary text-glow-blue">
                Chargement du blindtest...
              </p>
            </div>
          ) : track ? (
            <div className="space-y-8">
              <BlindtestCard
                track={track}
                round={currentRound}
                totalRounds={totalRounds}
                isPlaying={playingTrackId === track.id}
                playbackCurrentTime={playbackCurrentTime}
                playbackDuration={playbackDuration}
                onPlay={playTrack}
                onSeek={seekTrack}
                onAnswer={(guessLabel, source) => {
                  if (answerMutation.isPending || reveal) {
                    return
                  }

                  void answerMutation.mutate({ guessLabel, source })
                }}
                disabled={answerMutation.isPending}
                reveal={reveal}
              />

              {!reveal ? (
                <div className="mx-auto grid w-full max-w-xl gap-3 md:grid-cols-2">
                  <NeonButton
                    color="green"
                    size="md"
                    fullWidth
                    onClick={() => {
                      if (answerMutation.isPending) {
                        return
                      }

                      void answerMutation.mutate({
                        guessLabel: 'human',
                        source: 'button',
                      })
                    }}
                    disabled={answerMutation.isPending}
                  >
                    PAS IA
                  </NeonButton>

                  <NeonButton
                    color="orange"
                    size="md"
                    fullWidth
                    onClick={() => {
                      if (answerMutation.isPending) {
                        return
                      }

                      void answerMutation.mutate({
                        guessLabel: 'ai',
                        source: 'button',
                      })
                    }}
                    disabled={answerMutation.isPending}
                  >
                    IA
                  </NeonButton>
                </div>
              ) : (
                <div className="mx-auto w-full max-w-xl">
                  <NeonButton
                    color={reveal.isCorrect ? 'green' : 'orange'}
                    size="md"
                    fullWidth
                    onClick={() => {
                      void continueToNextStep()
                    }}
                  >
                    Suivant
                  </NeonButton>
                </div>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-xl rounded-[1.6rem] border border-border bg-card/85 p-8 text-center">
              <p className="font-body text-muted-foreground">
                Aucun morceau disponible pour l’instant.
              </p>
            </div>
          )}

          {feedback ? (
            <p
              aria-live="polite"
              className="text-center font-body text-sm text-accent"
            >
              {feedback}
            </p>
          ) : null}
        </div>
      </div>
    </Layout>
  )
}
