import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })
loadEnv()

function readEnv(name) {
  return process.env[name]?.trim()
}

function getR2Config() {
  const accountId = readEnv('R2_ACCOUNT_ID')
  const accessKeyId = readEnv('R2_ACCESS_KEY_ID')
  const secretAccessKey = readEnv('R2_SECRET_ACCESS_KEY')
  const bucketName = readEnv('R2_BUCKET_NAME')

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      'Configuration R2 incomplète. Renseigne R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY et R2_BUCKET_NAME.',
    )
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
  }
}

function parseArgs(argv) {
  const options = {
    out: 'downloads/r2',
    prefix: '',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--out') {
      options.out = argv[index + 1] || options.out
      index += 1
      continue
    }

    if (arg === '--prefix') {
      options.prefix = argv[index + 1] || ''
      index += 1
      continue
    }

    if (arg === '--help' || arg === '-h') {
      console.log(`Usage:
  node scripts/download-r2-bucket.mjs [--out downloads/r2] [--prefix tracks/]

Examples:
  node scripts/download-r2-bucket.mjs
  node scripts/download-r2-bucket.mjs --prefix tracks/
  node scripts/download-r2-bucket.mjs --out backups/r2`)
      process.exit(0)
    }
  }

  return options
}

async function listAllKeys(client, bucketName, prefix) {
  const keys = []
  let continuationToken = undefined

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix || undefined,
        ContinuationToken: continuationToken,
      }),
    )

    for (const item of response.Contents ?? []) {
      if (item.Key) {
        keys.push(item.Key)
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined
  } while (continuationToken)

  return keys
}

async function downloadObject(client, bucketName, key, outputRoot) {
  const outputPath = resolve(outputRoot, key)
  await mkdir(dirname(outputPath), { recursive: true })

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  )

  if (!response.Body) {
    throw new Error(`Réponse vide pour ${key}`)
  }

  await pipeline(response.Body, createWriteStream(outputPath))
  return outputPath
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const { accountId, accessKeyId, secretAccessKey, bucketName } = getR2Config()
  const outputRoot = resolve(options.out)

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  await mkdir(outputRoot, { recursive: true })

  const keys = await listAllKeys(client, bucketName, options.prefix)

  console.log(
    `Téléchargement de ${keys.length} fichier(s) depuis ${bucketName}${options.prefix ? ` (prefix: ${options.prefix})` : ''} vers ${outputRoot}`,
  )

  let downloaded = 0

  for (const key of keys) {
    await downloadObject(client, bucketName, key, outputRoot)
    downloaded += 1
    console.log(`[${downloaded}/${keys.length}] ${key}`)
  }

  console.log('Téléchargement terminé.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
