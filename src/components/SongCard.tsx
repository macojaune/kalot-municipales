import { Pause, Play } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { DuelTrack } from '../lib/kalot-client'
import { NeonButton } from './soundsystem/NeonButton'

type SongCardProps = {
  track: DuelTrack
  isChampion?: boolean
  isPlaying: boolean
  onPlay: () => void
  onVote: () => void
  onSeek: (ratio: number) => void
  playbackCurrentTime: number
  playbackDuration: number
  animationClass?: string
  disabled?: boolean
  className?: string
}

export function SongCard({
  track,
  isChampion,
  isPlaying,
  onPlay,
  onVote,
  onSeek,
  playbackCurrentTime,
  playbackDuration,
  animationClass,
  disabled = false,
  className,
}: SongCardProps) {
  const accentClasses = isChampion
    ? 'border-primary box-glow-green'
    : 'border-secondary box-glow-blue'

  const sliderHex = isChampion ? '#39ff14' : '#00b4d8'

  const progressRatio =
    playbackDuration > 0
      ? Math.max(0, Math.min(playbackCurrentTime / playbackDuration, 1))
      : 0
  const progressPercent = Math.round(progressRatio * 100)

  return (
    <div
      className={`relative neon-panel flex flex-col gap-3 rounded-xl border-2 p-3 transition-shadow ${accentClasses} ${animationClass || ''} ${
        disabled ? 'cursor-not-allowed opacity-95' : 'cursor-default'
      } ${className || ''}`}
    >
      <div className="relative flex h-full flex-col gap-3 text-left">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPlay}
            aria-label={isPlaying ? 'Mettre en pause' : 'Ecouter'}
            className={`play-orb inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-background transition-all active:scale-95 ${
              isChampion
                ? 'border-primary bg-primary shadow-[0_0_20px_rgba(57,255,20,0.5)]'
                : 'border-secondary bg-secondary shadow-[0_0_20px_rgba(0,180,216,0.5)]'
            } ${isPlaying ? 'is-playing' : ''}`}
            disabled={!track.streamUrl}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 translate-x-0.5" />
            )}
          </button>

          <div className="min-w-0 flex-1 space-y-1">
            <input
              type="range"
              min={0}
              max={1000}
              step={1}
              value={Math.round(progressRatio * 1000)}
              disabled={playbackDuration <= 0}
              onChange={(event) => {
                const ratio = Number(event.target.value) / 1000
                onSeek(ratio)
              }}
              className="audio-slider h-4 w-full"
              style={
                {
                  '--slider-color': sliderHex,
                  '--slider-progress': `${progressPercent}%`,
                } as CSSProperties
              }
            />
            <div className="flex items-center justify-between text-[10px] font-display tracking-widest text-muted-foreground">
              <span>{formatTime(playbackCurrentTime)}</span>
              <span>{formatTime(playbackDuration)}</span>
            </div>
          </div>
        </div>

        <h3 className="truncate font-display text-[1.95rem] font-bold leading-tight text-foreground">
          {track.title}
        </h3>

        <div className="w-full space-y-1 font-body text-sm text-muted-foreground md:text-base">
          <p className="break-words">
            Artiste:{' '}
            <span className="font-semibold text-foreground">
              {track.artistName.trim() || 'Inconnu'}
            </span>
          </p>
          <p className="break-words">
            {track.listName ? 'Liste:' : 'Candidat:'}{' '}
            <span className="font-semibold text-foreground">
              {track.listName ?? track.candidateName ?? 'Non renseigne'}
            </span>
          </p>
        </div>

        <div className="mt-auto w-full pt-1.5">
          <NeonButton
            color={isChampion ? 'green' : 'blue'}
            size="md"
            fullWidth
            onClick={onVote}
            disabled={disabled}
            className="min-h-[48px]"
          >
            Voter
          </NeonButton>
        </div>
      </div>
    </div>
  )
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00'
  }

  const totalSeconds = Math.floor(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remaining = totalSeconds % 60
  return `${minutes}:${String(remaining).padStart(2, '0')}`
}
