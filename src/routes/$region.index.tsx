import { createFileRoute } from '@tanstack/react-router'
import { buildSeo } from '../lib/seo'
import { HomePage } from './index'

export const Route = createFileRoute('/$region/')({
  head: ({ params }) =>
    buildSeo({
      title: 'Vote pour la meilleure musique de campagne',
      description:
        'Découvre les duels KalotMunicipales, vote pour les meilleures musiques de campagne 2026 et consulte le classement en direct.',
      path: `/${params.region}`,
    }),
  component: HomePage,
})
