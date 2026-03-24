import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '../lib/analytics'

type PlayableLeaderboardTrack = {
  id: number
  rank?: number
  communeName?: string
  streamUrl: string | null
}

export function useLeaderboardAudioPlayer(eventPrefix: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const loadedTrackIdRef = useRef<number | null>(null)
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null)

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

  function toggleTrack(song: PlayableLeaderboardTrack) {
    if (!song.streamUrl) {
      return
    }

    const audio = audioRef.current
    if (!audio) {
      return
    }

    if (loadedTrackIdRef.current === song.id) {
      if (playingTrackId === song.id) {
        trackEvent(`${eventPrefix}_track_pause`, {
          trackId: song.id,
          rank: song.rank,
          communeName: song.communeName,
        })
        audio.pause()
      } else {
        trackEvent(`${eventPrefix}_track_play`, {
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
    trackEvent(`${eventPrefix}_track_play`, {
      trackId: song.id,
      rank: song.rank,
      communeName: song.communeName,
    })
    void audio.play().catch(() => {
      setPlayingTrackId(null)
      trackEvent(`${eventPrefix}_track_play_failed`, {
        trackId: song.id,
        rank: song.rank,
        communeName: song.communeName,
      })
    })
  }

  return {
    playingTrackId,
    toggleTrack,
  }
}
