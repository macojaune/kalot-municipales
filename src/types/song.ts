export type Region = 'guadeloupe' | 'martinique' | 'guyane'

export function isRegion(value: string | null | undefined): value is Region {
  return (
    value === 'guadeloupe' || value === 'martinique' || value === 'guyane'
  )
}

export const REGION_LABELS: Record<Region, string> = {
  guadeloupe: 'Guadeloupe',
  martinique: 'Martinique',
  guyane: 'Guyane',
}

export const COMMUNES: Record<Region, string[]> = {
  guadeloupe: [
    'Anse-Bertrand',
    'Baie-Mahault',
    'Baillif',
    'Basse-Terre',
    'Bouillante',
    'Capesterre Belle-Eau',
    'Capesterre de Marie-Galante',
    'Deshaies',
    'Gourbeyre',
    'Goyave',
    'Grand-Bourg',
    'La Desirade',
    'Le Gosier',
    'Lamentin',
    'Le Moule',
    'Les Abymes',
    "Morne-a-l'Eau",
    'Petit-Bourg',
    'Petit-Canal',
    'Pointe-a-Pitre',
    'Pointe-Noire',
    'Port-Louis',
    'Saint-Claude',
    'Saint-Francois',
    'Saint-Louis',
    'Sainte-Anne',
    'Sainte-Rose',
    'Terre-de-Bas',
    'Terre-de-Haut',
    'Trois-Rivieres',
    'Vieux-Fort',
    'Vieux-Habitants',
  ],
  martinique: [
    "L'Ajoupa-Bouillon",
    'Basse-Pointe',
    'Bellefontaine',
    'Case-Pilote',
    'Ducos',
    'Fonds-Saint-Denis',
    'Fort-de-France',
    "Grand'Riviere",
    'Gros-Morne',
    "Les Anses-d'Arlet",
    'Les Trois-Ilets',
    'La Trinite',
    'Le Lamentin',
    'Le Carbet',
    'Le Diamant',
    'Le Francois',
    'Le Lorrain',
    'Le Marigot',
    'Le Marin',
    'Le Morne-Rouge',
    'Le Morne-Vert',
    'Le Precheur',
    'Le Robert',
    'Sainte-Marie',
    'Saint-Esprit',
    'Saint-Joseph',
    'Saint-Pierre',
    'Schoelcher',
    'Macouba',
    'Riviere-Salee',
    'Riviere-Pilote',
    'Sainte-Anne',
    'Sainte-Luce',
    'Le Vauclin',
  ],
  guyane: [
    'Apatou',
    'Awala-Yalimapo',
    'Camopi',
    'Cayenne',
    'Grand-Santi',
    'Iracoubo',
    'Kourou',
    'Macouria',
    'Mana',
    'Maripasoula',
    'Matoury',
    'Montsinery-Tonnegrande',
    'Ouanary',
    'Papaichton',
    'Regina',
    'Remire-Montjoly',
    'Sinnamary',
    'Roura',
    'Saint-Elie',
    'Saint-Georges',
    'Saint-Laurent-du-Maroni',
    'Saul',
  ],
}

function normalizeCommuneLookup(communeName: string) {
  return communeName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function getRegionsForCommune(communeName: string): Region[] {
  const normalized = normalizeCommuneLookup(communeName)
  const matches: Region[] = []

  for (const [region, communes] of Object.entries(COMMUNES) as Array<
    [Region, string[]]
  >) {
    const match = communes.some(
      (commune) => normalizeCommuneLookup(commune) === normalized,
    )
    if (match) {
      matches.push(region)
    }
  }

  return matches
}

export function getRegionForCommune(communeName: string): Region {
  const [region] = getRegionsForCommune(communeName)

  if (region) {
    return region
  }

  return 'guadeloupe'
}
