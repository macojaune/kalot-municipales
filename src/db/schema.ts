import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clerkId: text('clerk_id').notNull().unique(),
  username: text('username'),
  displayName: text('display_name'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
})

export const communes = sqliteTable('communes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
})

export const artists = sqliteTable('artists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  instagram: text('instagram'),
  tiktok: text('tiktok'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
})

export const electoralLists = sqliteTable(
  'electoral_lists',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    candidateName: text('candidate_name'),
    photoUrl: text('photo_url'),
    communeId: integer('commune_id')
      .notNull()
      .references(() => communes.id),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    communeSlugUnique: uniqueIndex('electoral_lists_commune_slug_unique').on(
      table.communeId,
      table.slug,
    ),
  }),
)

export const tracks = sqliteTable(
  'tracks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    r2Key: text('r2_key').notNull(),
    streamUrl: text('stream_url'),
    artistId: integer('artist_id').references(() => artists.id),
    communeId: integer('commune_id')
      .notNull()
      .references(() => communes.id),
    electoralListId: integer('electoral_list_id').references(
      () => electoralLists.id,
    ),
    rating: real('rating').notNull().default(1200),
    wins: integer('wins').notNull().default(0),
    losses: integer('losses').notNull().default(0),
    appearances: integer('appearances').notNull().default(0),
    round2Rating: real('round2_rating').notNull().default(1200),
    round2Wins: integer('round2_wins').notNull().default(0),
    round2Losses: integer('round2_losses').notNull().default(0),
    round2Appearances: integer('round2_appearances').notNull().default(0),
    isAiGenerated: integer('is_ai_generated', { mode: 'boolean' })
      .notNull()
      .default(false),
    isActive: integer('is_active', { mode: 'boolean' })
      .notNull()
      .default(true),
    isSeed: integer('is_seed', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    communeActiveIdx: index('tracks_commune_active_idx').on(
      table.communeId,
      table.isActive,
    ),
    electoralListActiveIdx: index('tracks_electoral_list_active_idx').on(
      table.electoralListId,
      table.isActive,
    ),
  }),
)

export const voteSessions = sqliteTable(
  'vote_sessions',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    electionRound: text('election_round', { enum: ['round1', 'round2'] })
      .notNull()
      .default('round1'),
    communeId: integer('commune_id').references(() => communes.id),
    status: text('status', { enum: ['active', 'waiting', 'completed'] })
      .notNull()
      .default('active'),
    currentChampionTrackId: integer('current_champion_track_id')
      .notNull()
      .references(() => tracks.id),
    currentChallengerTrackId: integer('current_challenger_track_id')
      .notNull()
      .references(() => tracks.id),
    seenTrackIds: text('seen_track_ids').notNull().default('[]'),
    roundsPlayed: integer('rounds_played').notNull().default(0),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    completedAt: text('completed_at'),
  },
  (table) => ({
    userRoundStatusCreatedIdx: index('vote_sessions_user_round_status_created_idx').on(
      table.userId,
      table.electionRound,
      table.status,
      table.createdAt,
    ),
  }),
)

export const aiGuessSessions = sqliteTable('ai_guess_sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  status: text('status', { enum: ['active', 'completed'] })
    .notNull()
    .default('active'),
  trackIds: text('track_ids').notNull().default('[]'),
  currentIndex: integer('current_index').notNull().default(0),
  correctAnswers: integer('correct_answers').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  completedAt: text('completed_at'),
})

export const aiGuesses = sqliteTable(
  'ai_guesses',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: text('session_id')
      .notNull()
      .references(() => aiGuessSessions.id),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    trackId: integer('track_id')
      .notNull()
      .references(() => tracks.id),
    roundNumber: integer('round_number').notNull(),
    guessedLabel: text('guessed_label', { enum: ['ai', 'human'] }).notNull(),
    actualLabel: text('actual_label', { enum: ['ai', 'human'] }).notNull(),
    isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    sessionRoundIdx: index('ai_guesses_session_round_idx').on(
      table.sessionId,
      table.roundNumber,
    ),
    trackIdx: index('ai_guesses_track_idx').on(table.trackId),
  }),
)

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
})

export const votes = sqliteTable(
  'votes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: text('session_id')
      .notNull()
      .references(() => voteSessions.id),
    electionRound: text('election_round', { enum: ['round1', 'round2'] })
      .notNull()
      .default('round1'),
    communeId: integer('commune_id').references(() => communes.id),
    roundNumber: integer('round_number').notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    leftTrackId: integer('left_track_id')
      .notNull()
      .references(() => tracks.id),
    rightTrackId: integer('right_track_id')
      .notNull()
      .references(() => tracks.id),
    winnerTrackId: integer('winner_track_id')
      .notNull()
      .references(() => tracks.id),
    loserTrackId: integer('loser_track_id')
      .notNull()
      .references(() => tracks.id),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    sessionIdx: index('votes_session_idx').on(table.sessionId),
  }),
)

export const round1CommuneWinners = sqliteTable('round1_commune_winners', {
  communeId: integer('commune_id')
    .primaryKey()
    .references(() => communes.id),
  winningTrackId: integer('winning_track_id')
    .notNull()
    .references(() => tracks.id),
  winningRating: real('winning_rating').notNull(),
  finalizedAt: text('finalized_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
})

export const reports = sqliteTable(
  'reports',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    trackId: integer('track_id')
      .notNull()
      .references(() => tracks.id),
    userId: integer('user_id').references(() => users.id),
    reason: text('reason').notNull(),
    status: text('status', { enum: ['open', 'reviewed', 'closed'] })
      .notNull()
      .default('open'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    trackStatusIdx: index('reports_track_status_idx').on(
      table.trackId,
      table.status,
    ),
  }),
)
