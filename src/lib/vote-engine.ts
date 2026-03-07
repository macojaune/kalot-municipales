import { readFile } from 'node:fs/promises'
import { and, asc, desc, eq, inArray, notInArray, sql } from 'drizzle-orm'
import { getDb } from '../db/client'
import {
  appSettings,
  artists,
  communes,
  electoralLists,
  reports,
  round1CommuneWinners,
  tracks,
  users,
  voteSessions,
  votes,
} from '../db/schema'
import { getOrSetServerCache, invalidateServerCache } from './server-cache'

const STARTING_RATING = 1200
const K_FACTOR = 24
const ROUND1_FINALIZATION_SETTING_KEY = 'round1_finalization_at'
const ROUND2_FINALIZATION_SETTING_KEY = 'round2_finalization_at'
const ROUND1_WINNERS_FINALIZED_AT_SETTING_KEY = 'round1_winners_finalized_at'
const DEFAULT_ROUND1_FINALIZATION_AT = '2026-03-16T03:59:59.000Z'
const DEFAULT_ROUND2_FINALIZATION_AT = '2026-03-23T03:59:59.000Z'
const ELECTION_PHASE_CACHE_TTL_MS = 60_000
const LEADERBOARD_CACHE_TTL_MS = 15_000
const ELECTORAL_LISTS_CACHE_TTL_MS = 30 * 60_000

const GUADELOUPE_COMMUNES = [
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
] as const

const ELECTORAL_SOURCE_URL = new URL(
  '../../../tmp/flourish-electoral-lists/municipales-guadeloupe-2026.json',
  import.meta.url,
)

const COMMUNE_ALIASES: Record<string, string> = {
  'capesterre-belle-eau': 'Capesterre Belle-Eau',
  'capesterre belle eau': 'Capesterre Belle-Eau',
  'capesterre-de-marie-galante': 'Capesterre de Marie-Galante',
  'capesterre de marie galante': 'Capesterre de Marie-Galante',
  'la desirade': 'La Desirade',
  'la-desirade': 'La Desirade',
  'le lamentin': 'Lamentin',
  lamentin: 'Lamentin',
  "morne-a-l'eau": "Morne-a-l'Eau",
  "morne a l'eau": "Morne-a-l'Eau",
  'pointe-a-pitre': 'Pointe-a-Pitre',
  'pointe a pitre': 'Pointe-a-Pitre',
  'saint-francois': 'Saint-Francois',
  'saint francois': 'Saint-Francois',
  'trois-rivieres': 'Trois-Rivieres',
  'trois rivieres': 'Trois-Rivieres',
}

type Db = ReturnType<typeof getDb>

export type ElectionRound = 'round1' | 'round2'
type ElectionPhase = ElectionRound | 'closed'

type TrackView = {
  id: number
  title: string
  slug: string
  streamUrl: string | null
  r2Key: string
  rating: number
  wins: number
  losses: number
  appearances: number
  communeId: number
  artistName: string
  communeName: string
  communeSlug: string
  listName: string | null
  candidateName: string | null
}

type ElectoralListReference = {
  id: number
  communeId: number
  communeName: string
  communeSlug: string
  listName: string
  candidateName: string | null
  photoUrl: string | null
}

type ElectoralImportRow = {
  communeName: string
  listName: string
  candidateName: string
  photoUrl: string | null
}

type SessionSummary = {
  electionRound: ElectionRound
  communeName: string | null
  roundsPlayed: number
  winnerTrackId: number
  scoreboard: Array<{
    trackId: number
    title: string
    points: number
  }>
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function normalizeLooseText(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function canonicalizeCommuneName(input: string) {
  const normalized = normalizeLooseText(input)
  const canonical = COMMUNE_ALIASES[normalized]

  if (canonical) {
    return canonical
  }

  return input.trim()
}

function getCommuneSlugCandidates(input: string) {
  const canonicalName = canonicalizeCommuneName(input)
  const slugCandidates = new Set<string>([slugify(canonicalName), slugify(input)])

  for (const [alias, candidate] of Object.entries(COMMUNE_ALIASES)) {
    if (candidate === canonicalName) {
      slugCandidates.add(slugify(alias))
    }
  }

  return {
    canonicalName,
    slugCandidates: Array.from(slugCandidates),
  }
}

function getElectoralListSlug(input: {
  candidateName?: string | null
  listName: string
}) {
  return slugify(input.candidateName?.trim() || input.listName.trim())
}

async function loadElectoralImportRows() {
  const raw = await readFile(ELECTORAL_SOURCE_URL, 'utf8')
  const parsed = JSON.parse(raw) as {
    communes?: Array<{
      commune?: string
      listes?: Array<{
        nom?: string
        nom_liste?: string
        photo?: string
      }>
    }>
  }

  const rows: ElectoralImportRow[] = []

  for (const communeEntry of parsed.communes ?? []) {
    const communeName = canonicalizeCommuneName(communeEntry.commune ?? '')

    for (const listEntry of communeEntry.listes ?? []) {
      const candidateName = listEntry.nom?.trim() ?? ''
      const listName = listEntry.nom_liste?.trim() ?? ''

      if (!communeName || !candidateName || !listName) {
        continue
      }

      rows.push({
        communeName,
        listName,
        candidateName,
        photoUrl: listEntry.photo?.trim() || null,
      })
    }
  }

  return rows.sort(
    (left, right) =>
      left.communeName.localeCompare(right.communeName, 'fr', { sensitivity: 'base' }) ||
      left.candidateName.localeCompare(right.candidateName, 'fr', { sensitivity: 'base' }),
  )
}

function randomInt(maxExclusive: number) {
  return Math.floor(Math.random() * maxExclusive)
}

function calculateElo(winnerRating: number, loserRating: number) {
  const expectedWinner = 1 / (1 + 10 ** ((loserRating - winnerRating) / 400))
  const expectedLoser = 1 - expectedWinner

  const nextWinnerRating = winnerRating + K_FACTOR * (1 - expectedWinner)
  const nextLoserRating = loserRating + K_FACTOR * (0 - expectedLoser)

  return {
    nextWinnerRating,
    nextLoserRating,
  }
}

function parseSeenTrackIds(raw: string) {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return new Set<number>()
    }

    return new Set(parsed.filter((value) => typeof value === 'number'))
  } catch {
    return new Set<number>()
  }
}

function parseIsoDate(raw: string | null | undefined) {
  if (!raw) {
    return null
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

async function resolveDateSetting(
  db: Db,
  input: {
    key: string
    fallback: string
    envValue?: string | null
  },
) {
  const settingRows = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, input.key))
    .limit(1)

  const fromDb = parseIsoDate(settingRows.at(0)?.value)
  if (fromDb) {
    return fromDb
  }

  const fromEnv = parseIsoDate(input.envValue)
  const fallback = parseIsoDate(input.fallback)

  if (!fallback) {
    throw new Error('Invalid default finalization date')
  }

  const initialValue = (fromEnv ?? fallback).toISOString()

  await db
    .insert(appSettings)
    .values({
      key: input.key,
      value: initialValue,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoNothing()

  return fromEnv ?? fallback
}

async function resolveRound1FinalizationAt(db: Db) {
  return resolveDateSetting(db, {
    key: ROUND1_FINALIZATION_SETTING_KEY,
    fallback: DEFAULT_ROUND1_FINALIZATION_AT,
    envValue: process.env.ROUND1_FINALIZATION_AT,
  })
}

async function resolveRound2FinalizationAt(db: Db) {
  return resolveDateSetting(db, {
    key: ROUND2_FINALIZATION_SETTING_KEY,
    fallback: DEFAULT_ROUND2_FINALIZATION_AT,
    envValue:
      process.env.ROUND2_FINALIZATION_AT ?? process.env.ELECTION_FINALIZATION_AT,
  })
}

async function resolveElectionPhase(db: Db): Promise<ElectionPhase> {
  return getOrSetServerCache('election:phase', ELECTION_PHASE_CACHE_TTL_MS, async () => {
    const [round1FinalizationAt, round2FinalizationAt] = await Promise.all([
      resolveRound1FinalizationAt(db),
      resolveRound2FinalizationAt(db),
    ])

    const now = new Date()
    if (now < round1FinalizationAt) {
      return 'round1'
    }

    if (now < round2FinalizationAt) {
      return 'round2'
    }

    return 'closed'
  })
}

async function maybeFinalizeRound1Winners(db: Db) {
  const phase = await resolveElectionPhase(db)
  if (phase === 'round1') {
    return
  }

  const alreadyFinalizedRows = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, ROUND1_WINNERS_FINALIZED_AT_SETTING_KEY))
    .limit(1)

  if (alreadyFinalizedRows.at(0)?.value) {
    return
  }

  const rows = await db
    .select({
      communeId: communes.id,
      rating: tracks.rating,
      trackId: tracks.id,
    })
    .from(communes)
    .innerJoin(tracks, eq(tracks.communeId, communes.id))
    .where(eq(tracks.isActive, true))
    .orderBy(communes.id, desc(tracks.rating), desc(tracks.wins), desc(tracks.appearances))

  const winnersByCommune = new Map<
    number,
    { communeId: number; trackId: number; rating: number }
  >()

  for (const row of rows) {
    if (!winnersByCommune.has(row.communeId)) {
      winnersByCommune.set(row.communeId, {
        communeId: row.communeId,
        trackId: row.trackId,
        rating: row.rating,
      })
    }
  }

  await db.transaction(async (tx) => {
    for (const winner of winnersByCommune.values()) {
      await tx
        .insert(round1CommuneWinners)
        .values({
          communeId: winner.communeId,
          winningTrackId: winner.trackId,
          winningRating: winner.rating,
        })
        .onConflictDoNothing()
    }

    await tx
      .insert(appSettings)
      .values({
        key: ROUND1_WINNERS_FINALIZED_AT_SETTING_KEY,
        value: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoNothing()
  })
}

async function getTrackViewsByIds(
  db: Db,
  ids: number[],
  round: ElectionRound = 'round1',
) {
  if (ids.length === 0) {
    return []
  }

  const rows = await db
    .select({
      id: tracks.id,
      title: tracks.title,
      slug: tracks.slug,
      streamUrl: tracks.streamUrl,
      r2Key: tracks.r2Key,
      rating: round === 'round2' ? tracks.round2Rating : tracks.rating,
      wins: round === 'round2' ? tracks.round2Wins : tracks.wins,
      losses: round === 'round2' ? tracks.round2Losses : tracks.losses,
      appearances: round === 'round2' ? tracks.round2Appearances : tracks.appearances,
      communeId: communes.id,
      artistName: sql<string>`coalesce(${artists.name}, '')`,
      communeName: communes.name,
      communeSlug: communes.slug,
      listName: electoralLists.name,
      candidateName: electoralLists.candidateName,
    })
    .from(tracks)
    .leftJoin(artists, eq(artists.id, tracks.artistId))
    .innerJoin(communes, eq(communes.id, tracks.communeId))
    .leftJoin(electoralLists, eq(electoralLists.id, tracks.electoralListId))
    .where(inArray(tracks.id, ids))

  const byId = new Map(rows.map((row) => [row.id, row]))
  return ids
    .map((id) => byId.get(id))
    .filter((row): row is TrackView => Boolean(row))
}

async function getTrackViewById(
  db: Db,
  id: number,
  round: ElectionRound = 'round1',
) {
  const rows = await getTrackViewsByIds(db, [id], round)
  return rows.at(0) ?? null
}

async function pickRandomChallenger(
  db: Db,
  input: {
    excludedTrackIds: number[]
    round: ElectionRound
    communeId?: number | null
  },
) {
  const filters = [eq(tracks.isActive, true)]

  if (input.round === 'round1' && input.communeId) {
    filters.push(eq(tracks.communeId, input.communeId))
  }

  if (input.excludedTrackIds.length > 0) {
    filters.push(notInArray(tracks.id, input.excludedTrackIds))
  }

  const sourceQuery = db
    .select({
      id: tracks.id,
      appearances:
        input.round === 'round2' ? tracks.round2Appearances : tracks.appearances,
    })
    .from(tracks)

  const candidates =
    input.round === 'round2'
      ? await sourceQuery
          .innerJoin(
            round1CommuneWinners,
            eq(round1CommuneWinners.winningTrackId, tracks.id),
          )
          .where(and(...filters))
      : await sourceQuery.where(and(...filters))

  if (candidates.length === 0) {
    return null
  }

  const weightedPool = candidates.map((candidate) => ({
    id: candidate.id,
    weight: 1 / (1 + candidate.appearances),
  }))

  const totalWeight = weightedPool.reduce((acc, item) => acc + item.weight, 0)
  let cursor = Math.random() * totalWeight

  for (const item of weightedPool) {
    cursor -= item.weight
    if (cursor <= 0) {
      return item.id
    }
  }

  return weightedPool.at(-1)?.id ?? null
}

async function getOrCreateUser(
  db: Db,
  params: { externalUserId: string; username?: string | null },
) {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, params.externalUserId))
    .limit(1)

  if (existing[0]) {
    return existing[0]
  }

  await db.insert(users).values({
    clerkId: params.externalUserId,
    username: params.username ?? null,
    displayName: params.username ?? null,
  })

  const created = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, params.externalUserId))
    .limit(1)

  if (!created[0]) {
    throw new Error('Unable to create user')
  }

  return created[0]
}

async function ensureCommune(db: Db, communeName: string) {
  const { canonicalName, slugCandidates } = getCommuneSlugCandidates(communeName)
  const slug = slugify(canonicalName)
  const existing = await db
    .select()
    .from(communes)
    .where(inArray(communes.slug, slugCandidates))
    .limit(1)

  if (existing[0]) {
    if (existing[0].name !== canonicalName || existing[0].slug !== slug) {
      await db
        .update(communes)
        .set({
          name: canonicalName,
          slug,
        })
        .where(eq(communes.id, existing[0].id))

      return {
        ...existing[0],
        name: canonicalName,
        slug,
      }
    }

    return existing[0]
  }

  await db.insert(communes).values({
    name: canonicalName,
    slug,
  })

  const created = await db
    .select()
    .from(communes)
    .where(eq(communes.slug, slug))
    .limit(1)

  if (!created[0]) {
    throw new Error('Unable to create commune')
  }

  return created[0]
}

async function ensureArtist(db: Db, artistName: string) {
  const existing = await db
    .select()
    .from(artists)
    .where(eq(artists.name, artistName))
    .limit(1)

  if (existing[0]) {
    return existing[0]
  }

  await db.insert(artists).values({
    name: artistName,
  })

  const created = await db
    .select()
    .from(artists)
    .where(eq(artists.name, artistName))
    .limit(1)

  if (!created[0]) {
    throw new Error('Unable to create artist')
  }

  return created[0]
}

async function ensureElectoralList(
  db: Db,
  params: {
    communeId: number
    listName: string
    candidateName?: string | null
    photoUrl?: string | null
  },
) {
  const slug = getElectoralListSlug({
    candidateName: params.candidateName,
    listName: params.listName,
  })

  const existing = await db
    .select()
    .from(electoralLists)
    .where(
      and(
        eq(electoralLists.communeId, params.communeId),
        eq(electoralLists.slug, slug),
      ),
    )
    .limit(1)

  if (existing[0]) {
    const shouldUpdate =
      existing[0].name !== params.listName ||
      existing[0].candidateName !== (params.candidateName ?? null) ||
      existing[0].photoUrl !== (params.photoUrl ?? null)

    if (shouldUpdate) {
      await db
        .update(electoralLists)
        .set({
          name: params.listName,
          candidateName: params.candidateName ?? null,
          photoUrl: params.photoUrl ?? null,
        })
        .where(eq(electoralLists.id, existing[0].id))

      return {
        ...existing[0],
        name: params.listName,
        candidateName: params.candidateName ?? null,
        photoUrl: params.photoUrl ?? null,
      }
    }

    return existing[0]
  }

  await db.insert(electoralLists).values({
    communeId: params.communeId,
    name: params.listName,
    slug,
    candidateName: params.candidateName ?? null,
    photoUrl: params.photoUrl ?? null,
  })

  const created = await db
    .select()
    .from(electoralLists)
    .where(
      and(
        eq(electoralLists.communeId, params.communeId),
        eq(electoralLists.slug, slug),
      ),
    )
    .limit(1)

  if (!created[0]) {
    throw new Error('Unable to create electoral list')
  }

  return created[0]
}

async function getUniqueTrackSlug(db: Db, baseTitle: string) {
  const base = slugify(baseTitle)
  const safeBase = base.length > 0 ? base : 'track'
  let candidate = safeBase
  let suffix = 2

  for (;;) {
    const existing = await db
      .select({ id: tracks.id })
      .from(tracks)
      .where(eq(tracks.slug, candidate))
      .limit(1)

    if (!existing[0]) {
      return candidate
    }

    candidate = `${safeBase}-${suffix}`
    suffix += 1
  }
}

async function getElectoralListReferenceById(
  db: Db,
  electoralListId: number,
): Promise<ElectoralListReference | null> {
  const rows = await db
    .select({
      id: electoralLists.id,
      communeId: communes.id,
      communeName: communes.name,
      communeSlug: communes.slug,
      listName: electoralLists.name,
      candidateName: electoralLists.candidateName,
      photoUrl: electoralLists.photoUrl,
    })
    .from(electoralLists)
    .innerJoin(communes, eq(communes.id, electoralLists.communeId))
    .where(eq(electoralLists.id, electoralListId))
    .limit(1)

  return rows[0] ?? null
}

export async function createTrack(input: {
  electoralListId?: number | null
  title?: string | null
  artistName?: string | null
  communeName?: string
  listName?: string | null
  candidateName?: string | null
  streamUrl?: string | null
  r2Key?: string | null
  isSeed?: boolean
}) {
  const db = getDb()
  const trimmedStreamUrl = input.streamUrl?.trim() || null

  if (!trimmedStreamUrl) {
    throw new Error('Stream URL is required')
  }

  const trimmedArtistName = input.artistName?.trim() || null
  const artist = trimmedArtistName ? await ensureArtist(db, trimmedArtistName) : null

  let resolvedCommuneId: number | null = null
  let resolvedCommuneName: string | null = null
  let electoralListId: number | null = null
  let resolvedListName: string | null = null
  let resolvedCandidateName: string | null = null

  if (typeof input.electoralListId === 'number') {
    const electoralList = await getElectoralListReferenceById(db, input.electoralListId)

    if (!electoralList) {
      throw new Error('Electoral list not found')
    }

    resolvedCommuneId = electoralList.communeId
    resolvedCommuneName = electoralList.communeName
    electoralListId = electoralList.id
    resolvedListName = electoralList.listName
    resolvedCandidateName = electoralList.candidateName
  } else {
    if (!input.communeName?.trim()) {
      throw new Error('Commune name is required')
    }

    const commune = await ensureCommune(db, input.communeName)
    resolvedCommuneId = commune.id
    resolvedCommuneName = commune.name

    const electoralList =
      input.listName && input.listName.trim().length > 0
        ? await ensureElectoralList(db, {
            communeId: commune.id,
            listName: input.listName,
            candidateName: input.candidateName,
          })
        : null

    electoralListId = electoralList?.id ?? null
    resolvedListName = electoralList?.name ?? input.listName?.trim() ?? null
    resolvedCandidateName = electoralList?.candidateName ?? input.candidateName?.trim() ?? null
  }

  const resolvedTitle =
    input.title?.trim() ||
    resolvedCandidateName ||
    resolvedListName ||
    (trimmedArtistName && resolvedCommuneName
      ? `${trimmedArtistName} - ${resolvedCommuneName}`
      : resolvedCommuneName ||
        'Son de campagne')

  const slug = await getUniqueTrackSlug(db, resolvedTitle)

  await db.insert(tracks).values({
    title: resolvedTitle,
    slug,
    r2Key: input.r2Key?.trim() || `manual/${slug}.mp3`,
    streamUrl: trimmedStreamUrl,
    artistId: artist?.id ?? null,
    communeId: resolvedCommuneId,
    electoralListId,
    rating: STARTING_RATING,
    isSeed: input.isSeed ?? false,
  })

  const created = await db
    .select({ id: tracks.id })
    .from(tracks)
    .where(eq(tracks.slug, slug))
    .limit(1)

  if (!created[0]) {
    throw new Error('Unable to create track')
  }

  const createdTrack = await getTrackViewById(db, created[0].id)
  if (!createdTrack) {
    throw new Error('Unable to load created track')
  }

  invalidateServerCache('leaderboard:')
  invalidateServerCache('electoral-lists:')

  return createdTrack
}

export async function seedDemoTracks() {
  const db = getDb()
  const count = await db.select({ value: sql<number>`count(*)` }).from(tracks)
  const existingCount = count[0]?.value ?? 0

  if (existingCount >= 8) {
    return { created: 0, total: existingCount }
  }

  const demoTracks = [
    {
      title: 'An Nou Voté La',
      artistName: 'DJ Kaskòd',
      communeName: 'Pointe-a-Pitre',
      listName: 'Lavi Dous 2026',
      candidateName: 'M. Dartron',
      streamUrl:
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    },
    {
      title: 'Bwadjak Remix Komin',
      artistName: 'MC Flanm',
      communeName: 'Les Abymes',
      listName: 'Fos Nouvo Souf',
      candidateName: 'S. Carole',
      streamUrl:
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    },
    {
      title: 'Mawché Ka Boujé',
      artistName: 'Krys Beat',
      communeName: 'Le Gosier',
      listName: 'Soley Gozié',
      candidateName: 'A. Lurel',
      streamUrl:
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    },
    {
      title: 'On Chimen Pou Demen',
      artistName: 'Lily Bass',
      communeName: 'Sainte-Anne',
      listName: 'Senyen Komin',
      candidateName: 'K. Bernier',
      streamUrl:
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    },
    {
      title: 'Ritm Politik Zouk',
      artistName: 'DJ Bwa',
      communeName: 'Baie-Mahault',
      listName: 'Baie Forward',
      candidateName: 'P. Moreau',
      streamUrl:
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    },
    {
      title: 'Kout Tanbou Pou Chanjman',
      artistName: 'Nina Flow',
      communeName: 'Basse-Terre',
      listName: 'Ansanm Basse-Terre',
      candidateName: 'R. Mathur',
      streamUrl:
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    },
    {
      title: 'Komin An Mouvman',
      artistName: 'Kolèktif 971',
      communeName: 'Petit-Bourg',
      listName: 'Mouvman 2026',
      candidateName: 'J. Plocost',
      streamUrl:
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    },
    {
      title: 'Top Campagne Freestyle',
      artistName: 'Timal Vibes',
      communeName: 'Le Moule',
      listName: 'Le Moule Leve',
      candidateName: 'N. Borel',
      streamUrl:
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    },
  ]

  let created = 0
  for (const track of demoTracks) {
    await createTrack({
      ...track,
      isSeed: true,
    })
    created += 1
  }

  return { created, total: existingCount + created }
}

export async function seedGuadeloupeCommunes() {
  const db = getDb()

  const existingRows = await db
    .select({ name: communes.name })
    .from(communes)
    .where(inArray(communes.name, [...GUADELOUPE_COMMUNES]))

  const existingSet = new Set(existingRows.map((row) => row.name))

  let inserted = 0
  for (const communeName of GUADELOUPE_COMMUNES) {
    if (existingSet.has(communeName)) {
      continue
    }

    await db.insert(communes).values({
      name: communeName,
      slug: slugify(communeName),
    })
    inserted += 1
  }

  return {
    inserted,
    totalTarget: GUADELOUPE_COMMUNES.length,
  }
}

export async function seedElectoralLists() {
  const db = getDb()
  const importedRows = await loadElectoralImportRows()

  let created = 0
  let updated = 0

  for (const row of importedRows) {
    const commune = await ensureCommune(db, row.communeName)
    const slug = getElectoralListSlug({
      candidateName: row.candidateName,
      listName: row.listName,
    })

    const existingRows = await db
      .select({
        id: electoralLists.id,
        name: electoralLists.name,
        candidateName: electoralLists.candidateName,
        photoUrl: electoralLists.photoUrl,
      })
      .from(electoralLists)
      .where(
        and(
          eq(electoralLists.communeId, commune.id),
          eq(electoralLists.slug, slug),
        ),
      )
      .limit(1)

    const existing = existingRows.at(0)

    if (!existing) {
      await db.insert(electoralLists).values({
        communeId: commune.id,
        name: row.listName,
        slug,
        candidateName: row.candidateName,
        photoUrl: row.photoUrl,
      })
      created += 1
      continue
    }

    if (
      existing.name !== row.listName ||
      existing.candidateName !== row.candidateName ||
      existing.photoUrl !== row.photoUrl
    ) {
      await db
        .update(electoralLists)
        .set({
          name: row.listName,
          candidateName: row.candidateName,
          photoUrl: row.photoUrl,
        })
        .where(eq(electoralLists.id, existing.id))
      updated += 1
    }
  }

  invalidateServerCache('electoral-lists:')

  return {
    created,
    updated,
    total: importedRows.length,
    totalCommunes: new Set(importedRows.map((row) => row.communeName)).size,
  }
}

export async function listElectoralListsForAdmin(input?: { communeName?: string | null }) {
  const db = getDb()
  const communeName = input?.communeName?.trim()
  const cacheKey = `electoral-lists:${communeName ? canonicalizeCommuneName(communeName) : 'all'}`

  return getOrSetServerCache(cacheKey, ELECTORAL_LISTS_CACHE_TTL_MS, async () => {
    const rows = await db
      .select({
        id: electoralLists.id,
        name: electoralLists.name,
        slug: electoralLists.slug,
        candidateName: electoralLists.candidateName,
        photoUrl: electoralLists.photoUrl,
        communeId: communes.id,
        communeName: communes.name,
        communeSlug: communes.slug,
      })
      .from(electoralLists)
      .innerJoin(communes, eq(communes.id, electoralLists.communeId))
      .where(
        communeName ? eq(communes.name, canonicalizeCommuneName(communeName)) : undefined,
      )
      .orderBy(
        asc(communes.name),
        asc(electoralLists.candidateName),
        asc(electoralLists.name),
      )

    const communesMap = new Map<
      string,
      {
        id: number
        name: string
        slug: string
        lists: Array<{
          id: number
          name: string
          slug: string
          candidateName: string | null
          photoUrl: string | null
        }>
      }
    >()

    for (const row of rows) {
      const existingCommune = communesMap.get(row.communeName)
      if (existingCommune) {
        existingCommune.lists.push({
          id: row.id,
          name: row.name,
          slug: row.slug,
          candidateName: row.candidateName,
          photoUrl: row.photoUrl,
        })
        continue
      }

      communesMap.set(row.communeName, {
        id: row.communeId,
        name: row.communeName,
        slug: row.communeSlug,
        lists: [
          {
            id: row.id,
            name: row.name,
            slug: row.slug,
            candidateName: row.candidateName,
            photoUrl: row.photoUrl,
          },
        ],
      })
    }

    return Array.from(communesMap.values())
  })
}

export async function assertAdminAccess(input: {
  externalUserId?: string | null
}) {
  if (!input.externalUserId) {
    return {
      ok: false as const,
      code: 'UNAUTHORIZED',
      message: 'Acces admin non autorise.',
    }
  }

  const db = getDb()
  const configuredAdminUserId = process.env.ADMIN_EXTERNAL_USER_ID?.trim() || null

  if (configuredAdminUserId) {
    if (input.externalUserId !== configuredAdminUserId) {
      return {
        ok: false as const,
        code: 'FORBIDDEN',
        message: 'Seul le compte admin autorise peut acceder a cette route.',
      }
    }

    return {
      ok: true as const,
    }
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, input.externalUserId))
    .limit(1)

  const account = existing.at(0)

  if (!account || account.id !== 1) {
    return {
      ok: false as const,
      code: 'FORBIDDEN',
      message: 'Seul le compte admin principal peut acceder a cette route.',
    }
  }

  return {
    ok: true as const,
  }
}

async function listEligibleTrackIds(
  db: Db,
  input: {
    round: ElectionRound
    communeId?: number | null
  },
) {
  const baseFilters = [eq(tracks.isActive, true)]

  if (input.round === 'round1') {
    return db
      .select({ id: tracks.id })
      .from(tracks)
      .where(and(...baseFilters))
  }

  await maybeFinalizeRound1Winners(db)

  return db
    .select({ id: tracks.id })
    .from(tracks)
    .innerJoin(
      round1CommuneWinners,
      eq(round1CommuneWinners.winningTrackId, tracks.id),
    )
    .where(and(...baseFilters))
}

async function listEligibleCommunesForRound1(db: Db) {
  const rows = await db
    .select({
      id: communes.id,
      name: communes.name,
      slug: communes.slug,
      trackCount: sql<number>`count(${tracks.id})`,
    })
    .from(communes)
    .innerJoin(tracks, eq(tracks.communeId, communes.id))
    .where(eq(tracks.isActive, true))
    .groupBy(communes.id, communes.name, communes.slug)
    .having(sql`count(${tracks.id}) >= 2`)
    .orderBy(asc(communes.name))

  return rows
}

async function countEligibleTracks(
  db: Db,
  input: {
    round: ElectionRound
    communeId?: number | null
  },
) {
  const filters = [eq(tracks.isActive, true)]

  if (input.round === 'round1' && input.communeId) {
    filters.push(eq(tracks.communeId, input.communeId))
  }

  const countRows =
    input.round === 'round2'
      ? await db
          .select({ value: sql<number>`count(*)` })
          .from(tracks)
          .innerJoin(
            round1CommuneWinners,
            eq(round1CommuneWinners.winningTrackId, tracks.id),
          )
          .where(and(...filters))
      : await db
          .select({ value: sql<number>`count(*)` })
          .from(tracks)
          .where(and(...filters))

  return Number(countRows[0]?.value ?? 0)
}

export async function startVoteSession(input: {
  externalUserId: string
  username?: string | null
  communeSlug?: string | null
}) {
  const db = getDb()
  const phase = await resolveElectionPhase(db)

  if (phase === 'closed') {
    return {
      ok: false as const,
      code: 'ELECTION_CLOSED' as const,
      message: 'Le vote est termine.',
    }
  }

  if (phase === 'round2') {
    await maybeFinalizeRound1Winners(db)
  }

  const user = await getOrCreateUser(db, {
    externalUserId: input.externalUserId,
    username: input.username,
  })

  const existingSessionRows = await db
    .select({
      id: voteSessions.id,
      status: voteSessions.status,
      electionRound: voteSessions.electionRound,
      communeId: voteSessions.communeId,
    })
    .from(voteSessions)
    .where(
      and(
        eq(voteSessions.userId, user.id),
        eq(voteSessions.electionRound, phase),
        eq(voteSessions.status, 'active'),
      ),
    )
    .orderBy(desc(voteSessions.createdAt))
    .limit(1)

  const existingSession = existingSessionRows.at(0)
  if (existingSession) {
    const existingState = await getSessionState({ sessionId: existingSession.id })

    if (existingState?.status === 'active') {
      return {
        ok: true as const,
        resumed: true as const,
        sessionId: existingSession.id,
        userId: user.id,
        electionRound: phase,
        commune: null,
        duel: existingState.duel,
      }
    }
  }

  const available = await listEligibleTrackIds(db, {
    round: phase,
    communeId: null,
  })

  if (available.length < 2) {
    return {
      ok: false as const,
      code: 'NOT_ENOUGH_TRACKS' as const,
      message:
        phase === 'round1'
          ? 'Ajoute au moins 2 sons pour lancer les duels.'
          : 'Le second tour n a pas assez de qualifies pour demarrer.',
    }
  }

  const firstIndex = randomInt(available.length)
  const firstId = available.at(firstIndex)?.id

  if (!firstId) {
    throw new Error('Unable to pick first track')
  }

  const remaining = available.filter((track) => track.id !== firstId)
  const secondId = remaining.at(randomInt(remaining.length))?.id

  if (!secondId) {
    throw new Error('Unable to pick second track')
  }

  const sessionId = crypto.randomUUID()

  await db.insert(voteSessions).values({
    id: sessionId,
    userId: user.id,
    electionRound: phase,
    communeId: null,
    currentChampionTrackId: firstId,
    currentChallengerTrackId: secondId,
    seenTrackIds: JSON.stringify([firstId, secondId]),
  })

  const startedTracks = await getTrackViewsByIds(db, [firstId, secondId], phase)
  const leftTrack = startedTracks.at(0)
  const rightTrack = startedTracks.at(1)

  if (!leftTrack || !rightTrack) {
    throw new Error('Unable to initialize duel tracks')
  }

  return {
    ok: true as const,
    resumed: false as const,
    sessionId,
    userId: user.id,
    electionRound: phase,
    commune: null,
    duel: {
      leftTrack,
      rightTrack,
      roundsPlayed: 0,
      progress: {
        seen: 2,
        total: available.length,
      },
    },
  }
}

export async function getSessionState(input: { sessionId: string }) {
  const db = getDb()
  const session = await db
    .select()
    .from(voteSessions)
    .where(eq(voteSessions.id, input.sessionId))
    .limit(1)

  if (!session[0]) {
    return null
  }

  const currentSession = session[0]
  const seen = parseSeenTrackIds(currentSession.seenTrackIds)
  const totalEligibleTracks = await countEligibleTracks(db, {
    round: currentSession.electionRound,
    communeId: currentSession.communeId,
  })

  if (currentSession.status === 'completed') {
    const summary = await getSessionSummary({ sessionId: currentSession.id })
    return {
      status: 'completed' as const,
      summary,
    }
  }

  const activeTracks = await getTrackViewsByIds(
    db,
    [currentSession.currentChampionTrackId, currentSession.currentChallengerTrackId],
    currentSession.electionRound,
  )
  const leftTrack = activeTracks.at(0)
  const rightTrack = activeTracks.at(1)

  if (!leftTrack || !rightTrack) {
    throw new Error('Unable to load active duel tracks')
  }

  return {
    status: 'active' as const,
    electionRound: currentSession.electionRound,
    communeId: currentSession.communeId,
    duel: {
      leftTrack,
      rightTrack,
      roundsPlayed: currentSession.roundsPlayed,
      progress: {
        seen: seen.size,
        total: totalEligibleTracks,
      },
    },
  }
}

export async function pickWinner(input: {
  sessionId: string
  winnerTrackId: number
  loserTrackId: number
  leftTrackId: number
  rightTrackId: number
}) {
  const db = getDb()

  const sessionRows = await db
    .select()
    .from(voteSessions)
    .where(eq(voteSessions.id, input.sessionId))
    .limit(1)

  const session = sessionRows.at(0)

  if (!session) {
    return {
      ok: false as const,
      code: 'SESSION_NOT_FOUND' as const,
      message: 'Session introuvable.',
    }
  }

  const totalEligibleTracks = await countEligibleTracks(db, {
    round: session.electionRound,
    communeId: session.communeId,
  })

  if (session.status === 'completed') {
    const summary = await getSessionSummary({ sessionId: session.id })
    return {
      ok: true as const,
      status: 'completed' as const,
      summary,
    }
  }

  const pairIds = [session.currentChampionTrackId, session.currentChallengerTrackId]
  if (
    !pairIds.includes(input.winnerTrackId) ||
    !pairIds.includes(input.loserTrackId) ||
    input.winnerTrackId === input.loserTrackId
  ) {
    return {
      ok: false as const,
      code: 'INVALID_DUEL' as const,
      message: 'Le duel ne correspond pas a la session active.',
    }
  }

  const votedTracks = await getTrackViewsByIds(
    db,
    [input.winnerTrackId, input.loserTrackId],
    session.electionRound,
  )
  const winnerTrack = votedTracks.at(0)
  const loserTrack = votedTracks.at(1)

  if (!winnerTrack || !loserTrack) {
    return {
      ok: false as const,
      code: 'TRACK_NOT_FOUND' as const,
      message: 'Un des sons est introuvable.',
    }
  }

  const { nextWinnerRating, nextLoserRating } = calculateElo(
    winnerTrack.rating,
    loserTrack.rating,
  )

  const seen = parseSeenTrackIds(session.seenTrackIds)
  seen.add(input.winnerTrackId)
  seen.add(input.loserTrackId)

  await db.transaction(async (tx) => {
    await tx.insert(votes).values({
      sessionId: session.id,
      electionRound: session.electionRound,
      communeId: session.communeId,
      roundNumber: session.roundsPlayed + 1,
      userId: session.userId,
      leftTrackId: input.leftTrackId,
      rightTrackId: input.rightTrackId,
      winnerTrackId: input.winnerTrackId,
      loserTrackId: input.loserTrackId,
    })

    if (session.electionRound === 'round2') {
      await tx
        .update(tracks)
        .set({
          round2Rating: nextWinnerRating,
          round2Wins: sql`${tracks.round2Wins} + 1`,
          round2Appearances: sql`${tracks.round2Appearances} + 1`,
        })
        .where(eq(tracks.id, input.winnerTrackId))

      await tx
        .update(tracks)
        .set({
          round2Rating: nextLoserRating,
          round2Losses: sql`${tracks.round2Losses} + 1`,
          round2Appearances: sql`${tracks.round2Appearances} + 1`,
        })
        .where(eq(tracks.id, input.loserTrackId))
    } else {
      await tx
        .update(tracks)
        .set({
          rating: nextWinnerRating,
          wins: sql`${tracks.wins} + 1`,
          appearances: sql`${tracks.appearances} + 1`,
        })
        .where(eq(tracks.id, input.winnerTrackId))

      await tx
        .update(tracks)
        .set({
          rating: nextLoserRating,
          losses: sql`${tracks.losses} + 1`,
          appearances: sql`${tracks.appearances} + 1`,
        })
        .where(eq(tracks.id, input.loserTrackId))
    }
  })

  invalidateServerCache('leaderboard:')

  const nextChallengerId = await pickRandomChallenger(db, {
    excludedTrackIds: Array.from(seen),
    round: session.electionRound,
    communeId: session.communeId,
  })

  if (!nextChallengerId) {
    await db
      .update(voteSessions)
      .set({
        status: 'completed',
        roundsPlayed: session.roundsPlayed + 1,
        currentChampionTrackId: input.winnerTrackId,
        currentChallengerTrackId: input.loserTrackId,
        seenTrackIds: JSON.stringify(Array.from(seen)),
        completedAt: new Date().toISOString(),
      })
      .where(eq(voteSessions.id, session.id))

    const summary = await getSessionSummary({ sessionId: session.id })
    return {
      ok: true as const,
      status: 'completed' as const,
      summary,
    }
  }

  seen.add(nextChallengerId)

  await db
    .update(voteSessions)
    .set({
      roundsPlayed: session.roundsPlayed + 1,
      currentChampionTrackId: input.winnerTrackId,
      currentChallengerTrackId: nextChallengerId,
      seenTrackIds: JSON.stringify(Array.from(seen)),
    })
    .where(eq(voteSessions.id, session.id))

  const nextChallenger = await getTrackViewById(
    db,
    nextChallengerId,
    session.electionRound,
  )

  return {
    ok: true as const,
    status: 'active' as const,
    nextChallenger,
    roundsPlayed: session.roundsPlayed + 1,
    progress: {
      seen: seen.size,
      total: totalEligibleTracks,
    },
  }
}

export async function getLeaderboard(input?: {
  electionRound?: ElectionRound | null
  communeSlug?: string | null
  limit?: number
}) {
  const db = getDb()
  const phase = await resolveElectionPhase(db)
  const electionRound = input?.electionRound ?? (phase === 'round1' ? 'round1' : 'round2')
  const limit = input?.limit ?? 20
  const cacheKey = `leaderboard:${electionRound}:${input?.communeSlug ?? 'all'}:${limit}`

  return getOrSetServerCache(cacheKey, LEADERBOARD_CACHE_TTL_MS, async () => {
    const filters = [eq(tracks.isActive, true)]

    if (electionRound === 'round2') {
      await maybeFinalizeRound1Winners(db)
    }

    if (electionRound === 'round1' && input?.communeSlug) {
      filters.push(eq(communes.slug, input.communeSlug))
    }

    const baseQuery = db
      .select({
        id: tracks.id,
        title: tracks.title,
        slug: tracks.slug,
        streamUrl: tracks.streamUrl,
        r2Key: tracks.r2Key,
        rating: electionRound === 'round2' ? tracks.round2Rating : tracks.rating,
        wins: electionRound === 'round2' ? tracks.round2Wins : tracks.wins,
        losses: electionRound === 'round2' ? tracks.round2Losses : tracks.losses,
        appearances:
          electionRound === 'round2' ? tracks.round2Appearances : tracks.appearances,
        artistName: sql<string>`coalesce(${artists.name}, '')`,
        communeId: communes.id,
        communeName: communes.name,
        communeSlug: communes.slug,
        listName: electoralLists.name,
        candidateName: electoralLists.candidateName,
      })
      .from(tracks)
      .leftJoin(artists, eq(artists.id, tracks.artistId))
      .innerJoin(communes, eq(communes.id, tracks.communeId))
      .leftJoin(electoralLists, eq(electoralLists.id, tracks.electoralListId))

    const rows =
      electionRound === 'round2'
        ? await baseQuery
            .innerJoin(
              round1CommuneWinners,
              eq(round1CommuneWinners.winningTrackId, tracks.id),
            )
            .where(and(...filters))
            .orderBy(
              desc(tracks.round2Rating),
              desc(tracks.round2Wins),
              desc(tracks.round2Appearances),
            )
            .limit(limit)
        : await baseQuery
            .where(and(...filters))
            .orderBy(desc(tracks.rating), desc(tracks.wins), desc(tracks.appearances))
            .limit(limit)

    return rows.map((row, index) => ({
      rank: index + 1,
      electionRound,
      ...row,
    }))
  })
}

export async function getVotingStartOptions() {
  const db = getDb()
  const electionRound = await resolveElectionPhase(db)

  if (electionRound === 'closed') {
    return {
      electionRound,
      eligibleCommunes: [],
    }
  }

  if (electionRound === 'round2') {
    await maybeFinalizeRound1Winners(db)
    return {
      electionRound,
      eligibleCommunes: [],
    }
  }

  const eligibleCommunes = await listEligibleCommunesForRound1(db)

  return {
    electionRound,
    eligibleCommunes,
  }
}

export async function submitReport(input: {
  trackId: number
  externalUserId?: string | null
  reason: string
}) {
  const db = getDb()

  let userId: number | null = null
  if (input.externalUserId) {
    const user = await getOrCreateUser(db, {
      externalUserId: input.externalUserId,
    })
    userId = user.id
  }

  await db.insert(reports).values({
    trackId: input.trackId,
    userId,
    reason: input.reason,
    status: 'open',
  })

  return { ok: true as const }
}

export async function listTracksForAdmin(input?: {
  includeInactive?: boolean
  limit?: number
}) {
  const db = getDb()
  const limit = input?.limit ?? 200

  const filters = []
  if (!input?.includeInactive) {
    filters.push(eq(tracks.isActive, true))
  }

  const rows = await db
    .select({
      id: tracks.id,
      title: tracks.title,
      slug: tracks.slug,
      streamUrl: tracks.streamUrl,
      rating: tracks.rating,
      wins: tracks.wins,
      losses: tracks.losses,
      isActive: tracks.isActive,
      createdAt: tracks.createdAt,
      artistName: sql<string>`coalesce(${artists.name}, '')`,
      communeName: communes.name,
      listName: electoralLists.name,
      candidateName: electoralLists.candidateName,
    })
    .from(tracks)
    .leftJoin(artists, eq(artists.id, tracks.artistId))
    .innerJoin(communes, eq(communes.id, tracks.communeId))
    .leftJoin(electoralLists, eq(electoralLists.id, tracks.electoralListId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(tracks.createdAt))
    .limit(limit)

  return rows
}

export async function archiveTrack(input: { trackId: number }) {
  const db = getDb()

  const existing = await db
    .select({ id: tracks.id, isActive: tracks.isActive })
    .from(tracks)
    .where(eq(tracks.id, input.trackId))
    .limit(1)

  if (!existing[0]) {
    return {
      ok: false as const,
      code: 'TRACK_NOT_FOUND' as const,
      message: 'Son introuvable.',
    }
  }

  await db
    .update(tracks)
    .set({
      isActive: false,
    })
    .where(eq(tracks.id, input.trackId))

  invalidateServerCache('leaderboard:')

  return {
    ok: true as const,
  }
}

export async function getSessionSummary(input: {
  sessionId: string
}): Promise<SessionSummary> {
  const db = getDb()

  const sessionRows = await db
    .select()
    .from(voteSessions)
    .where(eq(voteSessions.id, input.sessionId))
    .limit(1)

  const session = sessionRows.at(0)
  if (!session) {
    throw new Error('Session not found')
  }

  const commune =
    typeof session.communeId === 'number'
      ? await db
          .select({ name: communes.name })
          .from(communes)
          .where(eq(communes.id, session.communeId))
          .limit(1)
      : []

  const sessionVotes = await db
    .select({ winnerTrackId: votes.winnerTrackId })
    .from(votes)
    .where(eq(votes.sessionId, input.sessionId))

  const pointsMap = new Map<number, number>()
  for (const vote of sessionVotes) {
    pointsMap.set(
      vote.winnerTrackId,
      (pointsMap.get(vote.winnerTrackId) ?? 0) + 1,
    )
  }

  const trackIds = Array.from(pointsMap.keys())
  const scoredTracks = await getTrackViewsByIds(db, trackIds)

  const scoreboard = scoredTracks
    .map((track) => ({
      trackId: track.id,
      title: track.title,
      points: pointsMap.get(track.id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points)

  return {
    electionRound: session.electionRound,
    communeName: commune.at(0)?.name ?? null,
    roundsPlayed: session.roundsPlayed,
    winnerTrackId: session.currentChampionTrackId,
    scoreboard,
  }
}
