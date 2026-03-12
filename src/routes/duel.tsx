import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Layout } from '../components/Layout'
import { SongCard } from '../components/SongCard'
import { CrownIcon } from '../components/icons/CrownIcon'
import { trackEvent } from '../lib/analytics'
import { buildSeo } from '../lib/seo'
import { useRegionPath } from '../lib/region-routing'
import {
  clearActiveSessionId,
  getActiveSessionId,
  getJson,
  postJson,
  setLastSummary,
} from '../lib/kalot-client'
import type {
  DuelTrack,
  PickVoteResponse,
  SessionStateResponse,
} from '../lib/kalot-client'

type DuelStage = 'duel' | 'interlude'

type InterludeState = {
  winnerTrack: DuelTrack
  loserTrack: DuelTrack
  nextChallenger: DuelTrack
  roundsPlayed: number
  progress?: {
    seen: number
    total: number
  }
}

type PlaybackInfo = {
  currentTime: number
  duration: number
}

export const Route = createFileRoute('/duel')({
  head: () =>
    buildSeo({
      title: 'Duel musical en cours',
      description:
        'Vote entre deux musiques de campagne et fais monter ton favori dans le classement KalotMunicipales.',
      path: '/duel',
      robots: 'noindex,nofollow',
    }),
  component: DuelPage,
})

export function DuelPage() {
  const navigate = useNavigate()
  const classementHref = useRegionPath('/classement')
  const resultsHref = useRegionPath('/results')

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [champion, setChampion] = useState<DuelTrack | null>(null)
  const [challenger, setChallenger] = useState<DuelTrack | null>(null)
  const [duelIndex, setDuelIndex] = useState(1)
  const [totalDuels, setTotalDuels] = useState(2)
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [waitingMessage, setWaitingMessage] = useState<string | null>(null)
  const [stage, setStage] = useState<DuelStage>('duel')
  const [interlude, setInterlude] = useState<InterludeState | null>(null)
  const [playbackByTrackId, setPlaybackByTrackId] = useState<
    Partial<Record<number, PlaybackInfo>>
  >({})

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const loadedTrackIdRef = useRef<number | null>(null)
  const pendingSeekTimeRef = useRef<number>(0)
  const transitionTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio

    const updatePlaybackState = () => {
      const trackId = loadedTrackIdRef.current
      if (!trackId) {
        return
      }

      const duration = Number.isFinite(audio.duration) ? audio.duration : 0
      setPlaybackByTrackId((previous) => ({
        ...previous,
        [trackId]: {
          currentTime: audio.currentTime,
          duration,
        },
      }))
    }

    const handleLoadedMetadata = () => {
      const trackId = loadedTrackIdRef.current
      if (!trackId) {
        return
      }

      const duration = Number.isFinite(audio.duration) ? audio.duration : 0
      const seekTarget = Math.max(0, Math.min(pendingSeekTimeRef.current, duration))

      if (seekTarget > 0) {
        audio.currentTime = seekTarget
      }
      pendingSeekTimeRef.current = 0

      setPlaybackByTrackId((previous) => ({
        ...previous,
        [trackId]: {
          currentTime: audio.currentTime,
          duration,
        },
      }))
    }

    const handleEnded = () => {
      setPlayingTrackId(null)
      updatePlaybackState()
    }

    const handlePause = () => {
      setPlayingTrackId((previous) => {
        if (previous === loadedTrackIdRef.current) {
          return null
        }
        return previous
      })
      updatePlaybackState()
    }

    const handlePlay = () => {
      if (loadedTrackIdRef.current) {
        setPlayingTrackId(loadedTrackIdRef.current)
      }
    }

    audio.addEventListener('timeupdate', updatePlaybackState)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('play', handlePlay)

    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current)
      }
      audio.removeEventListener('timeupdate', updatePlaybackState)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('play', handlePlay)
      audio.pause()
    }
  }, [])

  useEffect(() => {
    setSessionId(getActiveSessionId())
  }, [])

  useEffect(() => {
    if (!champion || !challenger) {
      return
    }

    const loadedTrackId = loadedTrackIdRef.current
    if (!loadedTrackId) {
      return
    }

    if (loadedTrackId !== champion.id && loadedTrackId !== challenger.id) {
      audioRef.current?.pause()
      loadedTrackIdRef.current = null
      setPlayingTrackId(null)
    }
  }, [champion, challenger])

  const stateQuery = useQuery({
    queryKey: ['duel-state', sessionId],
    queryFn: () =>
      getJson<SessionStateResponse>(`/api/vote/state?sessionId=${sessionId}`),
    enabled: Boolean(sessionId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    const payload = stateQuery.data

    if (!payload || !payload.ok) {
      return
    }

    if (payload.status === 'completed') {
      setLastSummary(payload.summary)
      clearActiveSessionId()
      void navigate({ to: resultsHref })
      return
    }

    if (payload.status === 'waiting') {
      setStage('duel')
      setInterlude(null)
      setChampion(null)
      setChallenger(null)
      setWaitingMessage(payload.waiting.message)
      return
    }

    if (stage === 'interlude') {
      return
    }

    setWaitingMessage(null)
    setChampion(payload.duel.leftTrack)
    setChallenger(payload.duel.rightTrack)
    setDuelIndex(payload.duel.roundsPlayed + 1)
    setTotalDuels(Math.max(payload.duel.progress?.total ?? 2, 2))
  }, [navigate, stateQuery.data])

  const voteMutation = useMutation({
    mutationFn: async (winnerSide: 'left' | 'right') => {
      if (!sessionId || !champion || !challenger) {
        throw new Error('Session invalide.')
      }

      const winnerTrack = winnerSide === 'left' ? champion : challenger
      const loserTrack = winnerSide === 'left' ? challenger : champion

      trackEvent('duel_vote_pick', {
        side: winnerSide,
        winnerTrackId: winnerTrack.id,
        loserTrackId: loserTrack.id,
        duelIndex,
        totalDuels,
      })

      return {
        winnerTrack,
        loserTrack,
        response: await postJson<PickVoteResponse>('/api/vote/pick', {
          sessionId,
          winnerTrackId: winnerTrack.id,
          loserTrackId: loserTrack.id,
          leftTrackId: champion.id,
          rightTrackId: challenger.id,
        }),
      }
    },
    onSuccess: ({ winnerTrack, loserTrack, response }) => {
      audioRef.current?.pause()
      setPlayingTrackId(null)

      if (!response.ok) {
        setFeedback(response.message)
        return
      }

      if (response.status === 'active') {
        if (!response.nextChallenger) {
          setFeedback('Plus de challenger disponible.')
          return
        }

        setFeedback(null)
        setWaitingMessage(null)
        setStage('interlude')
        setInterlude({
          winnerTrack,
          loserTrack,
          nextChallenger: response.nextChallenger,
          roundsPlayed: response.roundsPlayed,
          progress: response.progress,
        })
        return
      }

      if (response.status === 'completed') {
        setLastSummary(response.summary)
        clearActiveSessionId()
        void navigate({ to: resultsHref })
        return
      }

      setStage('duel')
      setInterlude(null)
      setChampion(null)
      setChallenger(null)
      setWaitingMessage(response.waiting.message)
      if (typeof response.roundsPlayed === 'number') {
        setDuelIndex(response.roundsPlayed + 1)
      }
      if (response.progress?.total) {
        setTotalDuels(Math.max(response.progress.total, 2))
      }
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Vote impossible.')
    },
  })

  function playTrack(track: DuelTrack) {
    if (!track.streamUrl) {
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
    const resumeTime = playbackByTrackId[track.id]?.currentTime ?? 0
    pendingSeekTimeRef.current = resumeTime
    loadedTrackIdRef.current = track.id
    audio.src = track.streamUrl
    audio.load()
    void audio.play().catch(() => {
      setFeedback('Lecture audio indisponible.')
    })
  }

  function seekTrack(trackId: number, ratio: number) {
    const normalizedRatio = Math.max(0, Math.min(ratio, 1))
    const knownDuration = playbackByTrackId[trackId]?.duration ?? 0

    if (knownDuration <= 0) {
      return
    }

    const nextTime = knownDuration * normalizedRatio

    setPlaybackByTrackId((previous) => ({
      ...previous,
      [trackId]: {
        currentTime: nextTime,
        duration: knownDuration,
      },
    }))

    if (loadedTrackIdRef.current === trackId && audioRef.current) {
      audioRef.current.currentTime = nextTime
    } else if (loadedTrackIdRef.current !== trackId) {
      pendingSeekTimeRef.current = nextTime
    }
  }

  const handleContinueToNextRound = useCallback(() => {
    if (!interlude) {
      return
    }

    setChampion(interlude.winnerTrack)
    setChallenger(interlude.nextChallenger)
    setDuelIndex(interlude.roundsPlayed + 1)
    setTotalDuels(Math.max(interlude.progress?.total ?? totalDuels, 2))
    setStage('duel')
    setInterlude(null)
  }, [interlude, totalDuels])

  useEffect(() => {
    if (stage !== 'interlude' || !interlude) {
      return
    }

    transitionTimeoutRef.current = window.setTimeout(() => {
      handleContinueToNextRound()
    }, 850)

    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [handleContinueToNextRound, interlude, stage])

  const voteLocked = voteMutation.isPending || stage === 'interlude'

  return (
    <Layout
      backTo={null}
      headerRight={
        <button
          type="button"
          onClick={() => {
            trackEvent('duel_quit_click')
            void navigate({ to: classementHref })
          }}
          className="inline-flex min-h-9 items-center rounded-full border border-border px-3 text-[11px] font-display tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Quitter
        </button>
      }
    >
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-3 md:px-6 md:py-4">
        <div className="text-center">
          <p className="inline-flex rounded-full border border-border bg-card/70 px-4 py-1.5 font-display text-xs tracking-widest text-primary">
            Duels {Math.min(duelIndex, totalDuels)}/{totalDuels}
          </p>
        </div>

        {stage === 'interlude' && interlude ? (
          <section className="relative rounded-2xl border border-primary/30 bg-card/70 p-3 md:p-4">
            <div className="mx-auto max-w-xl space-y-2.5 animate-fade-in">
              <div className="text-center">
                <p className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 font-display text-[11px] tracking-widest text-primary">
                  <CrownIcon className="h-4 w-4" />
                  Vainqueur
                </p>
              </div>

              <SongCard
                track={interlude.winnerTrack}
                isChampion
                isPlaying={false}
                onPlay={() => {}}
                onVote={() => {}}
                onSeek={() => {}}
                playbackCurrentTime={0}
                playbackDuration={0}
                disabled
                className="animate-[fade-in_220ms_ease-out]"
              />

              <div className="pt-1 text-center font-display text-[11px] tracking-widest text-secondary animate-fade-in">
                Nouveau challenger
              </div>

              <SongCard
                track={interlude.nextChallenger}
                isPlaying={false}
                onPlay={() => {}}
                onVote={() => {}}
                onSeek={() => {}}
                playbackCurrentTime={0}
                playbackDuration={0}
                disabled
                className="opacity-80 animate-[fade-in_300ms_ease-out]"
              />
            </div>
          </section>
        ) : champion && challenger ? (
          <section className="relative rounded-2xl border border-border bg-card/75 p-3 md:p-4">
            <div className="hidden grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-6 md:grid">
              <div className="mx-auto w-full max-w-[520px] min-w-0 animate-slide-in-up space-y-1.5">
                <span className="inline-flex items-center rounded-full bg-primary/15 px-2.5 py-1 font-display text-xs text-primary">
                  Champion
                </span>
                <div className="aspect-square">
                  <SongCard
                    track={champion}
                    isChampion
                    className="h-full"
                    isPlaying={playingTrackId === champion.id}
                    onPlay={() => playTrack(champion)}
                    onVote={() => {
                      if (!voteLocked) {
                        void voteMutation.mutate('left')
                      }
                    }}
                    onSeek={(ratio) => seekTrack(champion.id, ratio)}
                    playbackCurrentTime={
                      playbackByTrackId[champion.id]?.currentTime ?? 0
                    }
                    playbackDuration={playbackByTrackId[champion.id]?.duration ?? 0}
                    disabled={voteLocked}
                  />
                </div>
              </div>

              <span className="self-center font-display text-5xl font-black text-accent text-glow-orange">
                VS
              </span>

              <div className="mx-auto w-full min-w-0 animate-slide-in-up space-y-1.5">
                <span className="inline-flex items-center rounded-full bg-secondary/15 px-2.5 py-1 font-display text-xs text-secondary">
                  Challenger
                </span>
                <div className="aspect-square">
                  <SongCard
                    track={challenger}
                    className="h-full"
                    isPlaying={playingTrackId === challenger.id}
                    onPlay={() => playTrack(challenger)}
                    onVote={() => {
                      if (!voteLocked) {
                        void voteMutation.mutate('right')
                      }
                    }}
                    onSeek={(ratio) => seekTrack(challenger.id, ratio)}
                    playbackCurrentTime={
                      playbackByTrackId[challenger.id]?.currentTime ?? 0
                    }
                    playbackDuration={
                      playbackByTrackId[challenger.id]?.duration ?? 0
                    }
                    disabled={voteLocked}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 py-0.5 md:hidden">
              <span className="inline-flex items-center rounded-full bg-primary/15 px-2.5 py-1 font-display text-xs text-primary">
                Champion
              </span>
              <SongCard
                track={champion}
                isChampion
                isPlaying={playingTrackId === champion.id}
                onPlay={() => playTrack(champion)}
                onVote={() => {
                  if (!voteLocked) {
                    void voteMutation.mutate('left')
                  }
                }}
                onSeek={(ratio) => seekTrack(champion.id, ratio)}
                playbackCurrentTime={playbackByTrackId[champion.id]?.currentTime ?? 0}
                playbackDuration={playbackByTrackId[champion.id]?.duration ?? 0}
                disabled={voteLocked}
              />

              <div className="py-0.5 text-center font-display text-4xl text-accent text-glow-orange">
                VS
              </div>

              <span className="inline-flex items-center rounded-full bg-secondary/15 px-2.5 py-1 font-display text-xs text-secondary">
                Challenger
              </span>
              <SongCard
                track={challenger}
                isPlaying={playingTrackId === challenger.id}
                onPlay={() => playTrack(challenger)}
                onVote={() => {
                  if (!voteLocked) {
                    void voteMutation.mutate('right')
                  }
                }}
                onSeek={(ratio) => seekTrack(challenger.id, ratio)}
                playbackCurrentTime={playbackByTrackId[challenger.id]?.currentTime ?? 0}
                playbackDuration={playbackByTrackId[challenger.id]?.duration ?? 0}
                disabled={voteLocked}
              />
            </div>
          </section>
        ) : (
          <div className="rounded-xl border border-border bg-card/75 p-4">
            <p className="text-sm font-body text-muted-foreground">
              {waitingMessage ?? 'Aucun duel actif pour le moment.'}
            </p>
          </div>
        )}

        {feedback ? (
          <p aria-live="polite" className="text-sm font-body text-accent">
            {feedback}
          </p>
        ) : null}
      </div>
    </Layout>
  )
}
