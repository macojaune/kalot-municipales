import { createClient } from '@libsql/client/http'
import { drizzle } from 'drizzle-orm/libsql/http'
import * as schema from './schema'

let dbInstance: ReturnType<typeof drizzle> | null = null
const viteEnv = import.meta.env as Record<string, string | undefined>

if (!process.env.TURSO_DATABASE_URL) {
  process.env.TURSO_DATABASE_URL = viteEnv.TURSO_DATABASE_URL
}

if (!process.env.TURSO_AUTH_TOKEN) {
  process.env.TURSO_AUTH_TOKEN = viteEnv.TURSO_AUTH_TOKEN
}

export function getDb() {
  if (!dbInstance) {
    const url = process.env.TURSO_DATABASE_URL

    if (!url) {
      throw new Error('Missing TURSO_DATABASE_URL in your environment')
    }

    const client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })

    dbInstance = drizzle(client, { schema })
  }

  return dbInstance
}

export type DbClient = ReturnType<typeof getDb>
