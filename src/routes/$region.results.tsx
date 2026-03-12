import { createFileRoute } from '@tanstack/react-router'
import { buildSeo } from '../lib/seo'
import { ResultsPage } from './results'

export const Route = createFileRoute('/$region/results')({
  head: ({ params }) =>
    buildSeo({
      title: 'Resultat de ta session de vote',
      description:
        'Retrouve le podium de ta session KalotMunicipales et partage ton top 3.',
      path: `/${params.region}/results`,
      robots: 'noindex,nofollow',
    }),
  component: ResultsPage,
})
