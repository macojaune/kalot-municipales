import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.local' })
config()

const url = process.env.TURSO_DATABASE_URL

if (!url) {
  throw new Error('Missing TURSO_DATABASE_URL in your environment')
}

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'turso',
  dbCredentials: {
    url,
    authToken: process.env.TURSO_AUTH_TOKEN ?? '',
  },
  verbose: true,
  strict: true,
})
