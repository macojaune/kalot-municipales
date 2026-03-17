import { createFileRoute } from '@tanstack/react-router'
import { buildSeo } from '../lib/seo'
import { LeaderboardPage } from './classement'

export const Route = createFileRoute('/$region/classement')({
  validateSearch: (search: Record<string, unknown>) => ({
    commune:
      typeof search.commune === 'string' && search.commune.trim().length > 0
        ? search.commune
        : undefined,
    round:
      search.round === 'round1' || search.round === 'round2'
        ? search.round
        : undefined,
  }),
  head: ({ params }) =>
    buildSeo({
      title: 'Classement general des sons de campagne',
      description:
        'Consulte le classement général KalotMunicipales et découvre les morceaux de campagne les mieux notés.',
      path: `/${params.region}/classement`,
    }),
  component: RegionalLeaderboardRoutePage,
})

function RegionalLeaderboardRoutePage() {
  const search = Route.useSearch()

  return (
    <LeaderboardPage
      initialCommuneSlug={search.commune ?? ''}
      initialRound={search.round}
    />
  )
}
