import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

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

export const electoralLists = sqliteTable('electoral_lists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  candidateName: text('candidate_name'),
  communeId: integer('commune_id')
    .notNull()
    .references(() => communes.id),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
})

export const tracks = sqliteTable('tracks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  r2Key: text('r2_key').notNull(),
  streamUrl: text('stream_url'),
  artistId: integer('artist_id')
    .notNull()
    .references(() => artists.id),
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
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  isSeed: integer('is_seed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
})

export const voteSessions = sqliteTable('vote_sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
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
})

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

export const votes = sqliteTable('votes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id')
    .notNull()
    .references(() => voteSessions.id),
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
})

export const reports = sqliteTable('reports', {
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
})
