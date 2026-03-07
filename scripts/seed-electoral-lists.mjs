#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { createClient } from '@libsql/client'
import { config } from 'dotenv'

config({ path: '.env.local' })
config()

const DEFAULT_SOURCE_PATH = path.resolve(
  process.cwd(),
  '../tmp/flourish-electoral-lists/municipales-guadeloupe-2026.json',
)

const COMMUNE_ALIASES = {
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

const { values } = parseArgs({
  options: {
    file: { type: 'string', default: DEFAULT_SOURCE_PATH },
  },
  allowPositionals: false,
})

const databaseUrl = process.env.TURSO_DATABASE_URL

if (!databaseUrl) {
  throw new Error('Missing TURSO_DATABASE_URL in your environment')
}

const client = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const rows = await loadRows(values.file)

let communesCreated = 0
let electoralListsCreated = 0
let electoralListsUpdated = 0

for (const row of rows) {
  const commune = await ensureCommune(row.communeName)
  const slug = getElectoralListSlug(row.candidateName, row.listName)
  const existingList = await client.execute({
    sql: `
      select id, name, candidate_name, photo_url
      from electoral_lists
      where commune_id = ? and slug = ?
      limit 1
    `,
    args: [commune.id, slug],
  })

  const currentList = existingList.rows[0]

  if (!currentList) {
    await client.execute({
      sql: `
        insert into electoral_lists (name, slug, candidate_name, photo_url, commune_id, created_at)
        values (?, ?, ?, ?, ?, ?)
      `,
      args: [
        row.listName,
        slug,
        row.candidateName,
        row.photoUrl,
        commune.id,
        new Date().toISOString(),
      ],
    })
    electoralListsCreated += 1
    continue
  }

  const sameValues =
    currentList.name === row.listName &&
    currentList.candidate_name === row.candidateName &&
    currentList.photo_url === row.photoUrl

  if (sameValues) {
    continue
  }

  await client.execute({
    sql: `
      update electoral_lists
      set name = ?, candidate_name = ?, photo_url = ?
      where id = ?
    `,
    args: [row.listName, row.candidateName, row.photoUrl, currentList.id],
  })
  electoralListsUpdated += 1
}

console.log(`Source: ${values.file}`)
console.log(`Communes creees: ${communesCreated}`)
console.log(`Listes creees: ${electoralListsCreated}`)
console.log(`Listes mises a jour: ${electoralListsUpdated}`)
console.log(`Total traite: ${rows.length}`)

await client.close()

async function loadRows(filePath) {
  const raw = await readFile(filePath, 'utf8')
  const parsed = JSON.parse(raw)
  const items = []

  for (const communeEntry of parsed.communes ?? []) {
    const communeName = canonicalizeCommuneName(communeEntry.commune ?? '')

    for (const listEntry of communeEntry.listes ?? []) {
      const candidateName = listEntry.nom?.trim() ?? ''
      const listName = listEntry.nom_liste?.trim() ?? ''

      if (!communeName || !candidateName || !listName) {
        continue
      }

      items.push({
        communeName,
        listName,
        candidateName,
        photoUrl: listEntry.photo?.trim() || null,
      })
    }
  }

  items.sort(
    (left, right) =>
      left.communeName.localeCompare(right.communeName, 'fr', { sensitivity: 'base' }) ||
      left.candidateName.localeCompare(right.candidateName, 'fr', { sensitivity: 'base' }),
  )

  return items
}

async function ensureCommune(communeName) {
  const canonicalName = canonicalizeCommuneName(communeName)
  const slug = slugify(canonicalName)
  const slugCandidates = Array.from(
    new Set([slugify(communeName), slug, ...getAliasSlugs(canonicalName)]),
  )

  const placeholders = slugCandidates.map(() => '?').join(', ')
  const existing = await client.execute({
    sql: `
      select id, name, slug
      from communes
      where slug in (${placeholders})
      limit 1
    `,
    args: slugCandidates,
  })

  const row = existing.rows[0]

  if (!row) {
    await client.execute({
      sql: 'insert into communes (name, slug, created_at) values (?, ?, ?)',
      args: [canonicalName, slug, new Date().toISOString()],
    })

    const created = await client.execute({
      sql: 'select id, name, slug from communes where slug = ? limit 1',
      args: [slug],
    })

    communesCreated += 1
    return created.rows[0]
  }

  if (row.name !== canonicalName || row.slug !== slug) {
    await client.execute({
      sql: 'update communes set name = ?, slug = ? where id = ?',
      args: [canonicalName, slug, row.id],
    })
    return { ...row, name: canonicalName, slug }
  }

  return row
}

function getElectoralListSlug(candidateName, listName) {
  return slugify(candidateName || listName)
}

function getAliasSlugs(canonicalName) {
  return Object.entries(COMMUNE_ALIASES)
    .filter(([, value]) => value === canonicalName)
    .map(([key]) => slugify(key))
}

function canonicalizeCommuneName(input) {
  const normalized = normalizeLooseText(input)
  return COMMUNE_ALIASES[normalized] || input.trim()
}

function normalizeLooseText(input) {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function slugify(input) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
