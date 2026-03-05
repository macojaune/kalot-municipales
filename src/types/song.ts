export type Region = 'guadeloupe' | 'martinique' | 'guyane'

export const REGION_LABELS: Record<Region, string> = {
  guadeloupe: 'Guadeloupe',
  martinique: 'Martinique',
  guyane: 'Guyane',
}

export const COMMUNES: Record<Region, string[]> = {
  guadeloupe: [
    'Pointe-a-Pitre',
    'Les Abymes',
    'Baie-Mahault',
    'Le Gosier',
    'Petit-Bourg',
    'Sainte-Anne',
    'Le Moule',
    'Sainte-Rose',
    'Capesterre-Belle-Eau',
    "Morne-a-l'Eau",
    'Basse-Terre',
  ],
  martinique: [
    'Fort-de-France',
    'Le Lamentin',
    'Le Robert',
    'Schoelcher',
    'Sainte-Marie',
    'Le Francois',
    'Ducos',
    'Saint-Joseph',
    'Riviere-Pilote',
    'La Trinite',
  ],
  guyane: [
    'Cayenne',
    'Matoury',
    'Saint-Laurent-du-Maroni',
    'Kourou',
    'Remire-Montjoly',
    'Macouria',
    'Mana',
    'Maripasoula',
    'Sinnamary',
    'Roura',
  ],
}

export function getRegionForCommune(communeName: string): Region {
  const normalized = communeName.trim().toLowerCase()

  for (const [region, communes] of Object.entries(COMMUNES) as Array<
    [Region, string[]]
  >) {
    const match = communes.some(
      (commune) => commune.toLowerCase() === normalized,
    )
    if (match) {
      return region
    }
  }

  return 'guadeloupe'
}
