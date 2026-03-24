import { Pause, Play } from 'lucide-react'
import clsx from 'clsx'
import type { LeaderboardResponse } from '../lib/kalot-client'

type LeaderboardTrack = LeaderboardResponse['leaderboard'][number]

type LeaderboardTrackListProps = {
  songs: LeaderboardTrack[]
  playingTrackId: number | null
  onToggleTrack: (song: LeaderboardTrack) => void
  variant?: 'full' | 'top3'
}

export function getListLabel(song: LeaderboardTrack) {
  return song.listName || null
}

export function getTrackLabel(song: LeaderboardTrack) {
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

export function LeaderboardTrackList({
  songs,
  playingTrackId,
  onToggleTrack,
  variant = 'full',
}: LeaderboardTrackListProps) {
  return (
    <section className={clsx('space-y-3', variant === 'top3' && 'space-y-3.5')}>
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
            className={clsx(
              'neon-panel relative overflow-hidden rounded-xl border px-4 py-3 md:py-4',
              'flex items-center gap-3',
              borderTone,
              variant === 'top3' && 'md:px-5',
            )}
          >
            <div className={clsx('w-8 text-center font-display text-2xl', medalColor)}>
              {index + 1}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-row items-baseline gap-2 md:gap-4">
                <p className="min-w-0 flex-1 truncate font-display text-xl font-semibold text-foreground">
                  {getTrackLabel(song)}
                </p>
                <span
                  className={clsx(
                    'max-w-[8rem] shrink truncate text-[11px] md:max-w-none md:text-sm',
                    medalColor,
                  )}
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
              onClick={() => onToggleTrack(song)}
              aria-label={
                playingTrackId === song.id
                  ? 'Mettre en pause'
                  : 'Ecouter le morceau'
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

            {variant === 'full' ? (
              <div className="shrink-0 text-right">
                <p className="tabular font-display text-base text-foreground md:text-xl">
                  {Math.round(song.rating)}
                </p>
                <p className="text-[9px] font-display tracking-widest text-muted-foreground md:text-[10px]">
                  PTS
                </p>
              </div>
            ) : null}
          </div>
        )
      })}
    </section>
  )
}
