import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { CrownIcon } from '../components/icons/CrownIcon'
import { DoubleMegaphone } from '../components/icons/DoubleMegaphone'
import { Layout } from '../components/Layout'
import { SongCard } from '../components/SongCard'
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

export const Route = createFileRoute('/duel')({
  component: DuelPage,
})

function DuelPage() {
  const navigate = useNavigate()

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [champion, setChampion] = useState<DuelTrack | null>(null)
  const [challenger, setChallenger] = useState<DuelTrack | null>(null)
  const [duelIndex, setDuelIndex] = useState(1)
  const [totalDuels, setTotalDuels] = useState(2)
  const [championAnim, setChampionAnim] = useState('')
  const [challengerAnim, setChallengerAnim] = useState('animate-slide-in-up')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [waitingMessage, setWaitingMessage] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const transitionTimeoutRef = useRef<number | null>(null)
  const pulseTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio

    const handleEnded = () => {
      setPlayingTrackId(null)
    }

    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('ended', handleEnded)
      audio.pause()
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current)
      }
      if (pulseTimeoutRef.current) {
        window.clearTimeout(pulseTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setSessionId(getActiveSessionId())
  }, [])

  const stateQuery = useQuery({
    queryKey: ['duel-state', sessionId],
    queryFn: () =>
      getJson<SessionStateResponse>(`/api/vote/state?sessionId=${sessionId}`),
    enabled: Boolean(sessionId),
    refetchInterval: 15000,
  })

  useEffect(() => {
    const payload = stateQuery.data

    if (!payload || !payload.ok) {
      return
    }

    if (payload.status === 'completed') {
      setLastSummary(payload.summary)
      clearActiveSessionId()
      void navigate({ to: '/results' })
      return
    }

    if (payload.status === 'waiting') {
      setChampion(null)
      setChallenger(null)
      setWaitingMessage(payload.waiting.message)
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

      return {
        winnerSide,
        winnerTrack,
        response: await postJson<PickVoteResponse>('/api/vote/pick', {
          sessionId,
          winnerTrackId: winnerTrack.id,
          loserTrackId: loserTrack.id,
          leftTrackId: champion.id,
          rightTrackId: challenger.id,
        }),
      }
    },
    onSuccess: ({ winnerSide, winnerTrack, response }) => {
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

        if (transitionTimeoutRef.current) {
          window.clearTimeout(transitionTimeoutRef.current)
        }

        if (pulseTimeoutRef.current) {
          window.clearTimeout(pulseTimeoutRef.current)
        }

        setIsTransitioning(true)
        setWaitingMessage(null)

        if (winnerSide === 'right') {
          setChampionAnim('animate-card-fade-out')
          setChallengerAnim('animate-card-promote')

          transitionTimeoutRef.current = window.setTimeout(() => {
            setChampion(winnerTrack)
            setChallenger(response.nextChallenger)
            setDuelIndex(response.roundsPlayed + 1)
            setTotalDuels(Math.max(response.progress?.total ?? totalDuels, 2))
            setChampionAnim('animate-champion-selected')
            setChallengerAnim('animate-slide-in-up')
            setIsTransitioning(false)

            pulseTimeoutRef.current = window.setTimeout(() => {
              setChampionAnim('')
            }, 200)
          }, 320)
        } else {
          setChampionAnim('animate-champion-selected')
          setChallengerAnim('animate-card-out')

          transitionTimeoutRef.current = window.setTimeout(() => {
            setChampion(winnerTrack)
            setChallenger(response.nextChallenger)
            setDuelIndex(response.roundsPlayed + 1)
            setTotalDuels(Math.max(response.progress?.total ?? totalDuels, 2))
            setChallengerAnim('animate-slide-in-up')
            setIsTransitioning(false)

            pulseTimeoutRef.current = window.setTimeout(() => {
              setChampionAnim('')
            }, 180)
          }, 260)
        }

        return
      }

      if (response.status === 'completed') {
        setLastSummary(response.summary)
        clearActiveSessionId()
        void navigate({ to: '/results' })
        return
      }

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

    if (playingTrackId === track.id) {
      audio.pause()
      setPlayingTrackId(null)
      return
    }

    audio.pause()
    audio.currentTime = 0
    audio.src = track.streamUrl
    void audio.play().catch(() => {
      setFeedback('Lecture audio indisponible.')
    })
    setPlayingTrackId(track.id)
  }

  const voteLocked = voteMutation.isPending || isTransitioning

  return (
    <Layout>
      <div className="max-w-lg md:max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-5 space-y-4">
        <div className="flex justify-between text-xs md:text-sm font-body text-muted-foreground">
          <span>En duel</span>
          <span className="tabular">
            {Math.min(duelIndex, totalDuels)}/{totalDuels}
          </span>
        </div>

        {champion && challenger ? (
          <>
            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-6">
              <div className="min-w-0 w-full max-w-[540px] mx-auto space-y-2.5">
                <span className="inline-flex items-center gap-1 bg-primary/15 text-foreground text-xs font-display font-bold px-2.5 py-1 rounded-full animate-badge-bounce">
                  <CrownIcon className="w-4 h-4" /> Champion
                </span>
                <div className="aspect-square">
                  <SongCard
                    track={champion}
                    isChampion
                    className={`h-full ${championAnim}`}
                    isPlaying={playingTrackId === champion.id}
                    onPlay={() => playTrack(champion)}
                    onVote={() => {
                      if (!voteLocked) {
                        void voteMutation.mutate('left')
                      }
                    }}
                    disabled={voteLocked}
                  />
                </div>
              </div>
              <span className="font-display font-black text-4xl  text-accent">
                VS
              </span>
              <div className="min-w-0 w-full mx-auto space-y-2.5 text-right">
                <span className="inline-flex items-center gap-1 bg-accent/15 text-accent text-xs font-display font-bold px-2.5 py-1 rounded-full animate-badge-bounce">
                  <DoubleMegaphone className="w-4 h-4" /> Challenger
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
                    animationClass={challengerAnim}
                    disabled={voteLocked}
                  />
                </div>
              </div>
            </div>

            <div className="md:hidden space-y-2.5 py-4">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1 bg-primary/15 text-foreground text-xs font-display font-bold px-2.5 py-1 rounded-full animate-badge-bounce">
                  <CrownIcon className="w-4 h-4" /> Champion
                </span>
                <div>
                  <SongCard
                    track={champion}
                    isChampion
                    className={`${championAnim}`}
                    isPlaying={playingTrackId === champion.id}
                    onPlay={() => playTrack(champion)}
                    onVote={() => {
                      if (!voteLocked) {
                        void voteMutation.mutate('left')
                      }
                    }}
                    disabled={voteLocked}
                  />
                </div>
              </div>

              <div className="text-center font-display font-black text-3xl pt-4 text-accent">
                VS
              </div>

              <div className="space-y-2 text-right">
                <span className="inline-flex items-center gap-1 bg-accent/15 text-accent text-xs font-display font-bold px-2.5 py-1 rounded-full animate-badge-bounce">
                  <DoubleMegaphone className="w-4 h-4" /> Challenger
                </span>
                <div>
                  <SongCard
                    track={challenger}
                    isPlaying={playingTrackId === challenger.id}
                    onPlay={() => playTrack(challenger)}
                    onVote={() => {
                      if (!voteLocked) {
                        void voteMutation.mutate('right')
                      }
                    }}
                    animationClass={challengerAnim}
                    disabled={voteLocked}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4 rounded-xl bg-card border border-border p-4">
            <p className="text-sm font-body text-muted-foreground">
              {waitingMessage ?? 'Aucun duel actif pour le moment.'}
            </p>
          </div>
        )}

        {feedback ? (
          <p
            aria-live="polite"
            className="text-sm font-body text-muted-foreground"
          >
            {feedback}
          </p>
        ) : null}
      </div>
    </Layout>
  )
}
