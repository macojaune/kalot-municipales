import { createFileRoute } from '@tanstack/react-router'
import { buildSeo } from '../lib/seo'
import { HomePage } from './index'

export const Route = createFileRoute('/$region/')({
  head: ({ params }) =>
    buildSeo({
      title: 'Classement final des musiques de campagne 2026',
      description:
        'Découvre le top 3 final de Kalot Municipales 2026, écoute les morceaux gagnants et accède au classement complet.',
      path: `/${params.region}`,
    }),
  component: HomePage,
})
