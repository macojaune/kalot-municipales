export type Region = 'guadeloupe' | 'martinique' | 'guyane'

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
