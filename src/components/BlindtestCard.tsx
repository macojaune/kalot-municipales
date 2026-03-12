import { Pause, Play } from 'lucide-react'
import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { BlindtestTrack, BlindtestTrackStats } from '../lib/kalot-client'
import { NeonButton } from './soundsystem/NeonButton'

type BlindtestCardProps = {
  track: BlindtestTrack
  round: number
  totalRounds: number
  isPlaying: boolean
  playbackCurrentTime: number
  playbackDuration: number
  onPlay: () => void
  onSeek: (ratio: number) => void
  onAnswer: (guessLabel: 'ai' | 'human', source: 'button' | 'swipe') => void
  disabled?: boolean
  reveal?: {
    userGuess: 'ai' | 'human'
    actualLabel: 'ai' | 'human'
    isCorrect: boolean
    stats: BlindtestTrackStats
  } | null
}

const SWIPE_THRESHOLD_PX = 110

export function BlindtestCard({
  track,
  round,
  totalRounds,
  isPlaying,
  playbackCurrentTime,
  playbackDuration,
  onPlay,
  onSeek,
  onAnswer,
  disabled = false,
  reveal = null,
}: BlindtestCardProps) {
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const pointerStartXRef = useRef<number | null>(null)
  const progressRatio =
    playbackDuration > 0
      ? Math.max(0, Math.min(playbackCurrentTime / playbackDuration, 1))
      : 0
  const progressPercent = Math.round(progressRatio * 100)

  function resetSwipe() {
    pointerStartXRef.current = null
    setIsDragging(false)
    setDragX(0)
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || reveal) {
      return
    }

    const target = event.target as HTMLElement
    if (target.closest('[data-no-swipe="true"]')) {
      return
    }

    pointerStartXRef.current = event.clientX
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isDragging || pointerStartXRef.current === null) {
      return
    }

    setDragX(event.clientX - pointerStartXRef.current)
  }

  function handlePointerEnd() {
    if (!isDragging) {
      return
    }

    const finalDragX = dragX
    resetSwipe()

    if (Math.abs(finalDragX) < SWIPE_THRESHOLD_PX) {
      return
    }

    onAnswer(finalDragX > 0 ? 'ai' : 'human', 'swipe')
  }

  const cardStyle = {
    transform: `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`,
    transition: isDragging ? 'none' : 'transform 180ms ease-out',
  } as CSSProperties

  const leftHintOpacity = Math.min(
    1,
    Math.max(0.15, Math.abs(Math.min(dragX, 0)) / 120),
  )
  const rightHintOpacity = Math.min(1, Math.max(0.15, Math.max(dragX, 0) / 120))
  const sliderColor = reveal
    ? reveal.actualLabel === 'ai'
      ? '#ff6b35'
      : '#39ff14'
    : '#00b4d8'

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="pointer-events-none absolute inset-x-2 top-8 flex items-start justify-between px-4 text-[11px] font-display tracking-[0.24em] text-muted-foreground">
        <span
          className={`rounded-full border border-border bg-card/85 px-3 py-1.5 transition-opacity ${
            dragX < -12 ? 'text-primary border-primary/45' : ''
          }`}
          style={{ opacity: leftHintOpacity }}
        >
          SWIPE GAUCHE = PAS IA
        </span>
        <span
          className={`rounded-full border border-border bg-card/85 px-3 py-1.5 transition-opacity ${
            dragX > 12 ? 'text-accent border-accent/45' : ''
          }`}
          style={{ opacity: rightHintOpacity }}
        >
          SWIPE DROITE = IA
        </span>
      </div>

      <div
        className={`relative overflow-hidden rounded-[1.6rem] border-2 bg-card/90 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.42)] md:p-5 ${
          reveal
            ? reveal.actualLabel === 'ai'
              ? 'border-accent box-glow-orange'
              : 'border-primary box-glow-green'
            : 'border-secondary/70 box-glow-blue'
        }`}
        style={cardStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_42%)]" />

        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-display tracking-[0.22em] text-secondary">
              ROUND {round}/{totalRounds}
            </span>
            <span className="rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-display tracking-[0.22em] text-muted-foreground">
              BLINDTEST IA
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
            <button
              type="button"
              data-no-swipe="true"
              onClick={onPlay}
              aria-label={isPlaying ? 'Mettre en pause' : 'Écouter'}
              disabled={!track.streamUrl}
              className={`play-orb inline-flex h-[4.5rem] w-[4.5rem] items-center justify-center self-start rounded-full border-2 text-background transition-all active:scale-95 ${
                reveal?.actualLabel === 'ai'
                  ? 'border-accent bg-accent shadow-[0_0_26px_rgba(255,107,53,0.45)]'
                  : reveal
                    ? 'border-primary bg-primary shadow-[0_0_26px_rgba(57,255,20,0.42)]'
                    : 'border-secondary bg-secondary shadow-[0_0_26px_rgba(0,180,216,0.42)]'
              } ${isPlaying ? 'is-playing' : ''}`}
            >
              {isPlaying ? (
                <Pause className="h-7 w-7" />
              ) : (
                <Play className="h-7 w-7 translate-x-0.5" />
              )}
            </button>

            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[11px] font-display tracking-[0.26em] text-muted-foreground">
                  ÉCOUTE ET DEVINE
                </p>
                <h1 className="break-words font-display text-[2.3rem] leading-[0.92] text-foreground md:text-[3rem]">
                  {track.title}
                </h1>
              </div>

              <div data-no-swipe="true" className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={1000}
                  step={1}
                  value={Math.round(progressRatio * 1000)}
                  disabled={playbackDuration <= 0}
                  onChange={(event) => {
                    onSeek(Number(event.target.value) / 1000)
                  }}
                  className="audio-slider h-4 w-full"
                  style={
                    {
                      '--slider-color': sliderColor,
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
          </div>

          {reveal ? (
            <div className="space-y-3 rounded-2xl border border-border bg-background/55 p-4">
              <div
                className={`rounded-[1.35rem] border p-4 text-center ${
                  reveal.isCorrect
                    ? 'border-primary/45 bg-primary/10 box-glow-green'
                    : 'border-accent/45 bg-accent/10 box-glow-orange'
                }`}
              >
                <p
                  className={`font-display text-sm tracking-[0.24em] ${
                    reveal.isCorrect ? 'text-primary' : 'text-accent'
                  }`}
                >
                  {reveal.isCorrect ? 'BIEN VU' : 'RATÉ'}
                </p>
                <p className="mt-3 font-display text-4xl leading-none text-foreground md:text-5xl">
                  {reveal.actualLabel === 'ai' ? 'IA' : 'PAS IA'}
                </p>
                <p className="mt-3 whitespace-pre-line font-body text-sm leading-relaxed text-foreground md:text-base">
                  {reveal.isCorrect
                    ? `Bien vu !\n${reveal.stats.guessedAiPercentage}% des joueurs ont pensé que ce morceau était généré par IA.`
                    : reveal.stats.guessedAiPercentage > 0
                      ? `C'est raté !\nMais ${reveal.stats.guessedAiPercentage}% des joueurs ont pensé que ce morceau était généré par IA.`
                      : "C'est raté !"}
                </p>
                <p className="mt-4 text-xs font-body leading-relaxed text-muted-foreground">
                  {reveal.actualLabel === 'ai'
                    ? 'Ce morceau est actuellement classé comme "IA" dans notre base.'
                    : 'Ce morceau est actuellement classé comme "pas IA" dans notre base, mais on ne peut pas le garantir à 100%.'}
                </p>
              </div>

            </div>
          ) : null}
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
