import { Flag, Pause, Play } from 'lucide-react'
import type { DuelTrack } from '../lib/kalot-client'
import { CrownIcon } from './icons/CrownIcon'
import { DoubleMegaphone } from './icons/DoubleMegaphone'
import { FistIcon } from './icons/FistIcon'

type SongCardProps = {
  track: DuelTrack
  isChampion?: boolean
  isPlaying: boolean
  onPlay: () => void
  onVote: () => void
  onReport: () => void
  animationClass?: string
}

export function SongCard({
  track,
  isChampion,
  isPlaying,
  onPlay,
  onVote,
  onReport,
  animationClass,
}: SongCardProps) {
  return (
    <article
      className={`relative flex flex-col rounded-xl border-2 p-4 transition-shadow ${
        isChampion
          ? 'border-primary bg-card shadow-lg animate-winner-pulse'
          : 'border-accent/50 bg-card shadow-md'
      } ${animationClass || ''}`}
    >
      <div className="flex items-center gap-2 mb-3">
        {isChampion ? (
          <span className="inline-flex items-center gap-1 bg-primary/15 text-foreground text-xs font-display font-bold px-2.5 py-1 rounded-full animate-badge-bounce">
            <CrownIcon className="w-4 h-4" /> Champion
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 bg-accent/15 text-accent text-xs font-display font-bold px-2.5 py-1 rounded-full animate-badge-bounce">
            <DoubleMegaphone className="w-4 h-4" /> Challenger
          </span>
        )}
      </div>

      <h3 className="font-display font-black text-lg leading-tight text-foreground break-words">
        {track.title}
      </h3>
      <p className="font-body text-sm text-muted-foreground mt-0.5 break-words">
        {track.artistName}
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-xs font-body text-muted-foreground">
        <span>{track.communeName}</span>
        {track.listName ? <span>{track.listName}</span> : null}
        {track.candidateName ? <span>{track.candidateName}</span> : null}
      </div>

      <button
        type="button"
        onClick={onPlay}
        aria-label={isPlaying ? 'Mettre en pause' : 'Ecouter'}
        className="mt-3 flex items-center gap-2 self-start px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-body text-sm font-medium
          hover:opacity-90 active:scale-95 transition-all min-h-[44px]"
        disabled={!track.streamUrl}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        {isPlaying ? 'Pause' : 'Ecouter'}
      </button>

      <button
        type="button"
        onClick={onVote}
        className="mt-3 w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-base
          hover:brightness-105 active:animate-vote-tap transition-all min-h-[52px]
          flex items-center justify-center gap-2 shadow-md"
      >
        <FistIcon className="w-5 h-5" />
        Je vote
      </button>

      <button
        type="button"
        onClick={onReport}
        className="mt-2 self-end flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors min-h-[44px] px-2"
        aria-label="Signaler ce son"
      >
        <Flag className="w-3 h-3" />
        Signaler
      </button>
    </article>
  )
}
