import { Pause, Play } from 'lucide-react'
import type { DuelTrack } from '../lib/kalot-client'
import { FistIcon } from './icons/FistIcon'

type SongCardProps = {
  track: DuelTrack
  isChampion?: boolean
  isPlaying: boolean
  onPlay: () => void
  onVote: () => void
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
  animationClass,
  disabled = false,
  className,
}: SongCardProps) {
  return (
    <div
      className={`relative flex flex-col rounded-xl border-2 p-4 transition-shadow ${
        isChampion
          ? 'border-primary bg-card shadow-lg animate-winner-pulse'
          : 'border-accent/50 bg-card shadow-md'
      } ${animationClass || ''} ${
        disabled
          ? 'opacity-70 cursor-not-allowed'
          : 'cursor-pointer active:scale-[0.995] hover:shadow-xl'
      } ${className || ''}`}
    >
      <button
        type="button"
        onClick={onVote}
        disabled={disabled}
        aria-label={`Voter pour ${track.title}`}
        className="absolute inset-0 z-0 rounded-xl"
      />

      <div className="relative z-10 flex h-full flex-col pointer-events-none">
        <button
          type="button"
          onClick={onPlay}
          aria-label={isPlaying ? 'Mettre en pause' : 'Ecouter'}
          className="pointer-events-auto absolute top-0 right-0 mt-0.5 mr-0.5 h-10 w-10 inline-flex items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-md
            hover:opacity-90 active:scale-95 transition-all"
          disabled={!track.streamUrl}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>

        <h3 className="pr-12 font-display font-black text-lg leading-tight text-foreground break-words">
          {track.title}
        </h3>
        <p className="pr-12 font-body text-sm text-muted-foreground mt-0.5 break-words">
          {track.artistName}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-xs font-body text-muted-foreground">
          <span>{track.communeName}</span>
          {track.listName ? <span>{track.listName}</span> : null}
          {track.candidateName ? <span>{track.candidateName}</span> : null}
        </div>

        <div className="mt-auto pt-3 pointer-events-auto flex justify-center">
          <button
            type="button"
            onClick={onVote}
            className="w-[min(100%,18rem)] py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm
            hover:brightness-105 active:animate-vote-tap transition-all min-h-[46px]
            inline-flex items-center justify-center gap-2 shadow-md"
            disabled={disabled}
          >
            <FistIcon className="w-5 h-5" />
            Je vote
          </button>
        </div>
      </div>
    </div>
  )
}
