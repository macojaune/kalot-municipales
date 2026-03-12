import { createFileRoute, Link } from '@tanstack/react-router'
import { BrainCircuit, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { NeonButton } from '../components/soundsystem/NeonButton'
import { trackEvent } from '../lib/analytics'
import { useRegionPath } from '../lib/region-routing'
import {
  getBlindtestSummary,
  type BlindtestSummary,
} from '../lib/kalot-client'
import { buildSeo } from '../lib/seo'

export const Route = createFileRoute('/blindtest/resultats')({
  head: () =>
    buildSeo({
      title: 'Résultats blindtest IA',
      description:
        'Retrouve ton score au blindtest IA et regarde sur quels morceaux tu t es trompé.',
      path: '/blindtest/resultats',
      robots: 'noindex,nofollow',
    }),
  component: BlindtestResultsPage,
})

export function BlindtestResultsPage() {
  const homeHref = useRegionPath('/')
  const blindtestHref = useRegionPath('/blindtest')
  const [summary, setSummary] = useState<BlindtestSummary | null>(null)

  useEffect(() => {
    setSummary(getBlindtestSummary())
  }, [])

  useEffect(() => {
    if (summary) {
      trackEvent('blindtest_results_viewed', {
        totalRounds: summary.totalRounds,
        correctAnswers: summary.correctAnswers,
      })
    }
  }, [summary])

  if (!summary) {
    return (
      <Layout backTo="/">
        <div className="mx-auto max-w-lg space-y-4 px-4 py-20 text-center">
          <p className="font-body text-muted-foreground">
            Aucun résultat disponible.
          </p>
          <Link to={homeHref} className="font-display text-secondary hover:underline">
            Retour à l’accueil
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout backTo="/blindtest">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:py-10">
        <section className="rounded-[1.8rem] border border-accent/40 bg-card/85 p-6 text-center box-glow-orange md:p-8">
          <BrainCircuit className="mx-auto h-14 w-14 text-accent" />
          <p className="mt-4 font-display text-sm tracking-[0.26em] text-accent">
            RÉSULTATS
          </p>
          <h1 className="mt-2 font-display text-5xl text-foreground md:text-6xl">
            {summary.correctAnswers}/{summary.totalRounds}
          </h1>
          <p className="mt-2 font-body text-base text-muted-foreground">
            {summary.accuracyPercentage}% de bonnes réponses
          </p>
        </section>

        <section className="grid gap-3">
          {summary.rounds.map((round, index) => (
            <article
              key={`${round.trackId}-${index}`}
              className={`rounded-2xl border p-4 ${
                round.isCorrect
                  ? 'border-primary/45 bg-primary/10 box-glow-green'
                  : 'border-accent/45 bg-accent/10 box-glow-orange'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-display tracking-[0.24em] text-muted-foreground">
                    ROUND {index + 1}
                  </p>
                  <h2 className="mt-1 font-display text-2xl text-foreground">
                    {round.title}
                  </h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-display tracking-[0.2em] ${
                    round.isCorrect
                      ? 'bg-primary/16 text-primary'
                      : 'bg-accent/16 text-accent'
                  }`}
                >
                  {round.isCorrect ? 'BIEN VU' : 'RATÉ'}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-sm font-body text-muted-foreground md:grid-cols-2">
                <p>
                  Ta réponse:{' '}
                  <span className="font-semibold text-foreground">
                    {round.userGuess === 'ai' ? 'IA' : 'Pas IA'}
                  </span>
                </p>
                <p>
                  Vérité:{' '}
                  <span className="font-semibold text-foreground">
                    {round.actualLabel === 'ai' ? 'IA' : 'Pas IA'}
                  </span>
                </p>
              </div>
            </article>
          ))}
        </section>

        <section className="flex flex-col gap-3 md:flex-row">
          <NeonButton
            color="orange"
            size="md"
            fullWidth
            onClick={() => {
              trackEvent('blindtest_replay_click')
              window.location.href = blindtestHref
            }}
          >
            <RotateCcw className="h-5 w-5" />
            Rejouer
          </NeonButton>
          <Link
            to={homeHref}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-[4px] border-2 border-secondary bg-transparent px-6 py-3 font-display text-base font-bold tracking-[0.08em] text-secondary transition-all duration-300 hover:bg-secondary hover:text-background hover:box-glow-blue active:scale-[0.97]"
          >
            Retour accueil
          </Link>
        </section>
      </div>
    </Layout>
  )
}
