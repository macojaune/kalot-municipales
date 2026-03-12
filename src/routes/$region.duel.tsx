import { createFileRoute } from '@tanstack/react-router'
import { buildSeo } from '../lib/seo'
import { DuelPage } from './duel'

export const Route = createFileRoute('/$region/duel')({
  head: ({ params }) =>
    buildSeo({
      title: 'Duel musical en cours',
      description:
        'Vote entre deux musiques de campagne et fais monter ton favori dans le classement KalotMunicipales.',
      path: `/${params.region}/duel`,
      robots: 'noindex,nofollow',
    }),
  component: DuelPage,
})
