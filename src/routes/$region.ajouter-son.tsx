import { createFileRoute } from '@tanstack/react-router'
import { buildSeo } from '../lib/seo'
import { SubmitTrackPage } from './ajouter-son'

export const Route = createFileRoute('/$region/ajouter-son')({
  head: ({ params }) =>
    buildSeo({
      title: 'Ajouter un son de campagne',
      description:
        'Propose rapidement un son de campagne pour KalotMunicipales en envoyant ton fichier audio et la liste concernée.',
      path: `/${params.region}/ajouter-son`,
    }),
  component: SubmitTrackPage,
})
