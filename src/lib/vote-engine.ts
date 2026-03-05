import { and, desc, eq, inArray, notInArray, sql } from 'drizzle-orm'
import { getDb } from '../db/client'
import {
  artists,
  communes,
  electoralLists,
  reports,
  tracks,
  users,
  voteSessions,
  votes,
} from '../db/schema'

const STARTING_RATING = 1200
const K_FACTOR = 24

type Db = ReturnType<typeof getDb>

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
  artistName: string
  communeName: string
  listName: string | null
  candidateName: string | null
}

type SessionSummary = {
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

async function getTrackViewsByIds(db: Db, ids: number[]) {
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
      rating: tracks.rating,
      wins: tracks.wins,
      losses: tracks.losses,
      appearances: tracks.appearances,
      artistName: artists.name,
      communeName: communes.name,
      listName: electoralLists.name,
      candidateName: electoralLists.candidateName,
    })
    .from(tracks)
    .innerJoin(artists, eq(artists.id, tracks.artistId))
    .innerJoin(communes, eq(communes.id, tracks.communeId))
    .leftJoin(electoralLists, eq(electoralLists.id, tracks.electoralListId))
    .where(inArray(tracks.id, ids))

  const byId = new Map(rows.map((row) => [row.id, row]))
  return ids
    .map((id) => byId.get(id))
    .filter((row): row is TrackView => Boolean(row))
}

async function getTrackViewById(db: Db, id: number) {
  const rows = await getTrackViewsByIds(db, [id])
  return rows.at(0) ?? null
}

async function pickRandomChallenger(db: Db, excludedTrackIds: number[]) {
  const filters = [eq(tracks.isActive, true)]

  if (excludedTrackIds.length > 0) {
    filters.push(notInArray(tracks.id, excludedTrackIds))
  }

  const candidates = await db
    .select({ id: tracks.id, appearances: tracks.appearances })
    .from(tracks)
    .where(and(...filters))

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
  const slug = slugify(communeName)
  const existing = await db
    .select()
    .from(communes)
    .where(eq(communes.slug, slug))
    .limit(1)

  if (existing[0]) {
    return existing[0]
  }

  await db.insert(communes).values({
    name: communeName,
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
  },
) {
  const existing = await db
    .select()
    .from(electoralLists)
    .where(
      and(
        eq(electoralLists.communeId, params.communeId),
        eq(electoralLists.name, params.listName),
      ),
    )
    .limit(1)

  if (existing[0]) {
    return existing[0]
  }

  await db.insert(electoralLists).values({
    communeId: params.communeId,
    name: params.listName,
    candidateName: params.candidateName ?? null,
  })

  const created = await db
    .select()
    .from(electoralLists)
    .where(
      and(
        eq(electoralLists.communeId, params.communeId),
        eq(electoralLists.name, params.listName),
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

export async function createTrack(input: {
  title: string
  artistName: string
  communeName: string
  listName?: string | null
  candidateName?: string | null
  streamUrl?: string | null
  r2Key?: string | null
  isSeed?: boolean
}) {
  const db = getDb()

  const artist = await ensureArtist(db, input.artistName)
  const commune = await ensureCommune(db, input.communeName)
  const electoralList =
    input.listName && input.listName.trim().length > 0
      ? await ensureElectoralList(db, {
          communeId: commune.id,
          listName: input.listName,
          candidateName: input.candidateName,
        })
      : null

  const slug = await getUniqueTrackSlug(db, input.title)

  await db.insert(tracks).values({
    title: input.title,
    slug,
    r2Key: input.r2Key ?? `manual/${slug}.mp3`,
    streamUrl: input.streamUrl ?? null,
    artistId: artist.id,
    communeId: commune.id,
    electoralListId: electoralList?.id ?? null,
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

export async function startVoteSession(input: {
  externalUserId: string
  username?: string | null
}) {
  const db = getDb()
  const user = await getOrCreateUser(db, {
    externalUserId: input.externalUserId,
    username: input.username,
  })

  const available = await db
    .select({ id: tracks.id })
    .from(tracks)
    .where(eq(tracks.isActive, true))

  if (available.length < 2) {
    return {
      ok: false as const,
      code: 'NOT_ENOUGH_TRACKS' as const,
      message: 'Ajoute au moins 2 sons pour demarrer les duels.',
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
    currentChampionTrackId: firstId,
    currentChallengerTrackId: secondId,
    seenTrackIds: JSON.stringify([firstId, secondId]),
  })

  const startedTracks = await getTrackViewsByIds(db, [firstId, secondId])
  const leftTrack = startedTracks.at(0)
  const rightTrack = startedTracks.at(1)

  if (!leftTrack || !rightTrack) {
    throw new Error('Unable to initialize duel tracks')
  }

  return {
    ok: true as const,
    sessionId,
    userId: user.id,
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

  const activeCount = await db
    .select({ value: sql<number>`count(*)` })
    .from(tracks)
    .where(eq(tracks.isActive, true))

  const totalActiveTracks = activeCount[0]?.value ?? 0

  if (currentSession.status === 'completed') {
    const summary = await getSessionSummary({ sessionId: currentSession.id })
    return {
      status: 'completed' as const,
      summary,
    }
  }

  const activeTracks = await getTrackViewsByIds(db, [
    currentSession.currentChampionTrackId,
    currentSession.currentChallengerTrackId,
  ])
  const leftTrack = activeTracks.at(0)
  const rightTrack = activeTracks.at(1)

  if (!leftTrack || !rightTrack) {
    throw new Error('Unable to load active duel tracks')
  }

  return {
    status: 'active' as const,
    duel: {
      leftTrack,
      rightTrack,
      roundsPlayed: currentSession.roundsPlayed,
      progress: {
        seen: seen.size,
        total: totalActiveTracks,
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

  const activeCount = await db
    .select({ value: sql<number>`count(*)` })
    .from(tracks)
    .where(eq(tracks.isActive, true))
  const totalActiveTracks = activeCount[0]?.value ?? 0

  if (!session) {
    return {
      ok: false as const,
      code: 'SESSION_NOT_FOUND' as const,
      message: 'Session introuvable.',
    }
  }

  if (session.status !== 'active') {
    const summary = await getSessionSummary({ sessionId: session.id })
    return {
      ok: true as const,
      status: 'completed' as const,
      summary,
    }
  }

  const pairIds = [
    session.currentChampionTrackId,
    session.currentChallengerTrackId,
  ]
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

  const votedTracks = await getTrackViewsByIds(db, [
    input.winnerTrackId,
    input.loserTrackId,
  ])
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
      roundNumber: session.roundsPlayed + 1,
      userId: session.userId,
      leftTrackId: input.leftTrackId,
      rightTrackId: input.rightTrackId,
      winnerTrackId: input.winnerTrackId,
      loserTrackId: input.loserTrackId,
    })

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
  })

  const nextChallengerId = await pickRandomChallenger(db, Array.from(seen))

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

  const nextChallenger = await getTrackViewById(db, nextChallengerId)

  return {
    ok: true as const,
    status: 'active' as const,
    nextChallenger,
    roundsPlayed: session.roundsPlayed + 1,
    progress: {
      seen: seen.size,
      total: totalActiveTracks,
    },
  }
}

export async function getLeaderboard(input?: {
  communeSlug?: string | null
  limit?: number
}) {
  const db = getDb()
  const limit = input?.limit ?? 20
  const filters = [eq(tracks.isActive, true)]

  if (input?.communeSlug) {
    filters.push(eq(communes.slug, input.communeSlug))
  }

  const rows = await db
    .select({
      id: tracks.id,
      title: tracks.title,
      slug: tracks.slug,
      streamUrl: tracks.streamUrl,
      r2Key: tracks.r2Key,
      rating: tracks.rating,
      wins: tracks.wins,
      losses: tracks.losses,
      appearances: tracks.appearances,
      artistName: artists.name,
      communeName: communes.name,
      communeSlug: communes.slug,
      listName: electoralLists.name,
      candidateName: electoralLists.candidateName,
    })
    .from(tracks)
    .innerJoin(artists, eq(artists.id, tracks.artistId))
    .innerJoin(communes, eq(communes.id, tracks.communeId))
    .leftJoin(electoralLists, eq(electoralLists.id, tracks.electoralListId))
    .where(and(...filters))
    .orderBy(desc(tracks.rating), desc(tracks.wins), desc(tracks.appearances))
    .limit(limit)

  return rows.map((row, index) => ({
    rank: index + 1,
    ...row,
  }))
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
      artistName: artists.name,
      communeName: communes.name,
      listName: electoralLists.name,
      candidateName: electoralLists.candidateName,
    })
    .from(tracks)
    .innerJoin(artists, eq(artists.id, tracks.artistId))
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
    roundsPlayed: session.roundsPlayed,
    winnerTrackId: session.currentChampionTrackId,
    scoreboard,
  }
}
