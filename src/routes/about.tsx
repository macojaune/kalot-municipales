import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '../components/Layout'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  return (
    <Layout>
      <main className="max-w-lg mx-auto px-4 py-8">
        <section className="p-6 sm:p-8 rounded-xl bg-card border border-border">
          <h1 className="font-display m-0 text-4xl font-extrabold">
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
