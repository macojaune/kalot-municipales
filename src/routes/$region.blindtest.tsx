import { createFileRoute } from '@tanstack/react-router'
import { buildSeo } from '../lib/seo'
import { BlindtestPage } from './blindtest'

export const Route = createFileRoute('/$region/blindtest')({
  head: ({ params }) =>
    buildSeo({
      title: 'Blindtest IA',
      description:
        "Écoute un morceau de campagne et essaie de deviner s'il a été généré par IA.",
      path: `/${params.region}/blindtest`,
      robots: 'noindex,nofollow',
    }),
  component: BlindtestPage,
})
