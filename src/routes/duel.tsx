import { useUser } from '@clerk/clerk-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Layout } from '../components/Layout'
import { SongCard } from '../components/SongCard'
import {
  clearActiveSessionId,
  getActiveSessionId,
  getDisplayName,
  getExternalUserId,
  getJson,
  postJson,
  setActiveSessionId,
  setLastSummary,
} from '../lib/kalot-client'
import type {
  DuelTrack,
  PickVoteResponse,
  SessionStateResponse,
  StartSessionResponse,
} from '../lib/kalot-client'

export const Route = createFileRoute('/duel')({
  component: DuelPage,
})

function DuelPage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const externalUserId = getExternalUserId(user)
  const displayName = getDisplayName(user)

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
  })

  useEffect(() => {
    if (!stateQuery.data || !stateQuery.data.ok) {
      return
    }

    if (stateQuery.data.status === 'completed') {
      setLastSummary(stateQuery.data.summary)
      clearActiveSessionId()
      void navigate({ to: '/results' })
      return
    }

    setChampion(stateQuery.data.duel.leftTrack)
    setChallenger(stateQuery.data.duel.rightTrack)
    setDuelIndex(stateQuery.data.duel.roundsPlayed + 1)
    setTotalDuels(Math.max(stateQuery.data.duel.progress?.total ?? 2, 2))
  }, [navigate, stateQuery.data])

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      if (!externalUserId) {
        throw new Error('Connecte-toi pour lancer la competition.')
      }

      return postJson<StartSessionResponse>('/api/vote/start', {
        externalUserId,
        username: displayName,
      })
    },
    onSuccess: (response) => {
      if (!response.ok) {
        setFeedback(response.message)
        return
      }

      setActiveSessionId(response.sessionId)
      setSessionId(response.sessionId)
      setChampion(response.duel.leftTrack)
      setChallenger(response.duel.rightTrack)
      setDuelIndex(1)
      setTotalDuels(Math.max(response.duel.progress?.total ?? 2, 2))
      setFeedback(null)
    },
    onError: (error) => {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Impossible de demarrer la session.',
      )
    },
  })

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

      if (response.status === 'completed') {
        setLastSummary(response.summary)
        clearActiveSessionId()
        void navigate({ to: '/results' })
        return
      }

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
    audio.src = track.streamUrl
    void audio.play().catch(() => {
      setFeedback('Lecture audio indisponible.')
    })
    setPlayingTrackId(track.id)
  }

  const progressPct = Math.round((duelIndex / Math.max(totalDuels, 1)) * 100)
  const voteLocked = voteMutation.isPending || isTransitioning

  return (
    <Layout>
      <div className="max-w-lg md:max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-5 space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-body text-muted-foreground">
            <span>
              Duel {Math.min(duelIndex, totalDuels)}/{totalDuels}
            </span>
            <span>{Math.min(progressPct, 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progressPct, 100)}%` }}
            />
          </div>
        </div>

        {champion && challenger ? (
          <>
            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6">
              <div className="min-w-0 w-full max-w-[620px] mx-auto space-y-2">
                <p className="font-display font-bold text-sm text-foreground text-left">
                  Champion
                </p>
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
              <span className="font-display font-black text-3xl text-accent">
                VS
              </span>
              <div className="min-w-0 w-full max-w-[620px] mx-auto space-y-2">
                <p className="font-display font-bold text-sm text-foreground text-right">
                  Challenger
                </p>
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

            <div className="md:hidden space-y-3">
              <p className="font-display font-bold text-sm text-foreground text-left">
                Champion
              </p>
              <SongCard
                track={champion}
                isChampion
                className={championAnim}
                isPlaying={playingTrackId === champion.id}
                onPlay={() => playTrack(champion)}
                onVote={() => {
                  if (!voteLocked) {
                    void voteMutation.mutate('left')
                  }
                }}
                disabled={voteLocked}
              />
              <div className="text-center font-display font-black text-2xl text-accent">
                VS
              </div>
              <p className="font-display font-bold text-sm text-foreground text-right">
                Challenger
              </p>
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

            <p className="text-center text-xs font-body text-muted-foreground">
              Tape sur la carte pour voter plus vite
            </p>
          </>
        ) : (
          <div className="space-y-4 rounded-xl bg-card border border-border p-4">
            <p className="text-sm font-body text-muted-foreground">
              Aucun duel actif.
            </p>
            <button
              type="button"
              onClick={() => void startSessionMutation.mutate()}
              disabled={startSessionMutation.isPending}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold min-h-[44px]"
            >
              {startSessionMutation.isPending ? 'Demarrage…' : 'Lancer un duel'}
            </button>
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
