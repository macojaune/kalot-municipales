import { createFileRoute } from '@tanstack/react-router'
import { buildSeo } from '../lib/seo'
import { BlindtestResultsPage } from './blindtest.resultats'

export const Route = createFileRoute('/$region/blindtest/resultats')({
  head: ({ params }) =>
    buildSeo({
      title: 'Résultats blindtest IA',
      description:
        'Retrouve ton score au blindtest IA et regarde sur quels morceaux tu t es trompé.',
      path: `/${params.region}/blindtest/resultats`,
      robots: 'noindex,nofollow',
    }),
  component: BlindtestResultsPage,
})
