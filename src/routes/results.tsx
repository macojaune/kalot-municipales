import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { RotateCcw, Share2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import { CrownIcon } from '../components/icons/CrownIcon'
import { DoubleMegaphone } from '../components/icons/DoubleMegaphone'
import { getLastSummary } from '../lib/kalot-client'

export const Route = createFileRoute('/results')({
  component: ResultsPage,
})

function ResultsPage() {
  const navigate = useNavigate()
  const summary = getLastSummary()
  const [feedback, setFeedback] = useState<string | null>(null)

  const champion = useMemo(() => {
    if (!summary?.scoreboard.length) {
      return null
    }

    return (
      [...summary.scoreboard].sort((a, b) => b.points - a.points)[0] ?? null
    )
  }, [summary])

  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => ({
        id: index,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 1.5}s`,
        color: [
          'hsl(var(--primary))',
          'hsl(var(--accent))',
          'hsl(var(--secondary))',
          'hsl(var(--victory))',
        ][index % 4],
      })),
    [],
  )

  async function handleShare() {
    if (!champion) {
      return
    }

    const text = `Mon champion sur KalotMunicipales : ${champion.title} (${champion.points} points). An nou vote !`

    try {
      await navigator.share({ text })
      return
    } catch {
      // noop
    }

    try {
      await navigator.clipboard.writeText(text)
      setFeedback('Resultat copie !')
    } catch {
      setFeedback(text)
    }
  }

  if (!summary || !champion) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4 animate-fade-in">
          <p className="text-muted-foreground font-body">
            Aucun resultat disponible
          </p>
          <Link
            to="/duel"
            className="text-primary font-display font-bold hover:underline"
          >
            Lancer un duel
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-8 space-y-8 animate-fade-in relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confettiPieces.map((piece) => (
            <div
              key={piece.id}
              className="absolute w-2 h-2 rounded-sm animate-confetti-fall"
              style={{
                left: piece.left,
                animationDelay: piece.delay,
                backgroundColor: piece.color,
                top: '-8px',
              }}
            />
          ))}
        </div>

        <div className="text-center space-y-4">
          <CrownIcon className="w-16 h-16 mx-auto animate-badge-bounce" />
          <h1 className="text-3xl font-display font-black text-foreground">
            Ton champion !
          </h1>
        </div>

        <div className="p-6 rounded-xl bg-card border-2 border-primary shadow-lg text-center space-y-2">
          <h2 className="font-display font-black text-2xl text-foreground break-words">
            {champion.title}
          </h2>
          <p className="text-sm text-muted-foreground font-body">
            Score session: {champion.points}
          </p>
        </div>

        <div className="text-center font-body text-muted-foreground">
          {summary.roundsPlayed} duels joues
        </div>

        {summary.scoreboard.length > 1 ? (
          <div className="space-y-2">
            <h3 className="font-display font-bold text-sm text-foreground">
              Ton Top 3
            </h3>
            {summary.scoreboard.slice(0, 3).map((song, index) => (
              <div
                key={song.trackId}
                className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
              >
                <span className="font-display font-black text-lg text-primary w-6 text-center">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm truncate">
                    {song.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate font-body tabular">
                    {song.points} points
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void navigate({ to: '/duel' })}
            className="py-4 rounded-xl bg-secondary text-secondary-foreground font-display font-bold
              hover:brightness-105 active:scale-[0.97] transition-all flex items-center justify-center gap-2 min-h-[52px]"
          >
            <RotateCcw className="w-5 h-5" />
            Rejouer
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold
              hover:brightness-105 active:scale-[0.97] transition-all flex items-center justify-center gap-2 min-h-[52px]"
          >
            <Share2 className="w-5 h-5" />
            Partager
          </button>
        </div>

        {feedback ? (
          <p
            aria-live="polite"
            className="text-sm text-muted-foreground font-body text-center"
          >
            {feedback}
          </p>
        ) : null}

        <div className="flex justify-center">
          <DoubleMegaphone className="w-8 h-8 opacity-45" />
        </div>
      </div>
    </Layout>
  )
}
