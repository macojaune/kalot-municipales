import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '../components/Layout'
import { buildSeo } from '../lib/seo'

export const Route = createFileRoute('/about')({
  head: () =>
    buildSeo({
      title: 'A propos de KalotMunicipales',
      description:
        'Découvre le concept KalotMunicipales, une plateforme communautaire pour classer les sons de campagne en duel.',
      path: '/about',
    }),
  component: AboutPage,
})

function AboutPage() {
  return (
    <Layout>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <section className="p-6 sm:p-8 rounded-xl bg-card/75 border border-secondary/35 neon-panel">
          <h1 className="font-display m-0 text-4xl font-extrabold text-secondary text-glow-blue">
            A propos de KalotMunicipales
          </h1>
          <p className="mt-3 text-base text-muted-foreground font-body">
            Plateforme communautaire pour classer les sons de campagne via des
            duels rapides. Le systeme winner-stays-on fait rester le champion,
            puis un nouveau challenger arrive.
          </p>
          <p className="mt-2 text-base text-muted-foreground font-body">
            Les classements sont mis a jour avec un score Elo afin de garder une
            competition continue, lisible et engageante.
          </p>
        </section>
      </main>
    </Layout>
  )
}
