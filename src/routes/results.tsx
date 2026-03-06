import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { RotateCcw, Share2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import { CrownIcon } from '../components/icons/CrownIcon'
import { NeonButton } from '../components/soundsystem/NeonButton'
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

    return [...summary.scoreboard].sort((a, b) => b.points - a.points)[0] ?? null
  }, [summary])

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
          <p className="text-muted-foreground font-body">Aucun resultat disponible</p>
          <Link to="/duel" className="text-primary font-display hover:underline">
            Lancer un duel
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-10 space-y-7 animate-fade-in relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20">
          <div className="h-[28rem] w-[28rem] rounded-full border border-accent/60 animate-ping [animation-duration:2.8s]" />
        </div>

        <section className="relative z-10 text-center space-y-3">
          <CrownIcon className="w-16 h-16 mx-auto animate-badge-bounce" />
          <h1 className="font-display text-4xl md:text-5xl text-accent text-glow-orange">
            Session terminee
          </h1>
          <p className="text-muted-foreground">Le public a parle. Voici ton champion.</p>
        </section>

        <section className="relative z-10 rounded-2xl border border-accent/45 bg-card/80 p-6 md:p-8 text-center box-glow-orange">
          <p className="font-display text-xs text-accent tracking-widest">#1 CHAMPION</p>
          <h2 className="mt-2 font-display text-4xl md:text-5xl text-foreground break-words">
            {champion.title}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground tabular">
            Score session: {champion.points} points
          </p>
          <p className="mt-1 text-xs font-display tracking-widest text-muted-foreground">
            {summary.roundsPlayed} DUELS JOUES
          </p>
        </section>

        {summary.scoreboard.length > 1 ? (
          <section className="relative z-10 space-y-2">
            <h3 className="font-display text-secondary text-glow-blue">Top 3 session</h3>
            {summary.scoreboard.slice(0, 3).map((song, index) => {
              const medalColor =
                index === 0
                  ? 'text-primary text-glow-green'
                  : index === 1
                    ? 'text-secondary text-glow-blue'
                    : 'text-accent text-glow-orange'

              const borderTone =
                index === 0
                  ? 'border-primary/45 box-glow-green'
                  : index === 1
                    ? 'border-secondary/45 box-glow-blue'
                    : 'border-accent/45 box-glow-orange'

              return (
                <div
                  key={song.trackId}
                  className={`neon-panel rounded-lg border p-3 flex items-center gap-3 ${borderTone}`}
                >
                  <span className={`w-7 text-center font-display text-xl ${medalColor}`}>
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base text-foreground truncate">
                      {song.title}
                    </p>
                    <p className="text-xs text-muted-foreground tabular">
                      {song.points} points
                    </p>
                  </div>
                </div>
              )
            })}
          </section>
        ) : null}

        <section className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NeonButton
            color="blue"
            size="md"
            fullWidth
            onClick={() => void navigate({ to: '/duel' })}
          >
            <RotateCcw className="w-5 h-5" />
            Rejouer
          </NeonButton>

          <NeonButton color="orange" size="md" fullWidth onClick={() => void handleShare()}>
            <Share2 className="w-5 h-5" />
            Partager
          </NeonButton>
        </section>

        {feedback ? (
          <p aria-live="polite" className="relative z-10 text-sm text-center text-accent">
            {feedback}
          </p>
        ) : null}
      </div>
    </Layout>
  )
}
