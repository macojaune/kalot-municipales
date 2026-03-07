import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const viteEnv = import.meta.env as Record<string, string | undefined>
const AUDIO_PREFIX = 'tracks'
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set([
  'aac',
  'flac',
  'm4a',
  'mp3',
  'mp4',
  'ogg',
  'wav',
  'webm',
])
const MIME_BY_EXTENSION: Record<string, string> = {
  aac: 'audio/aac',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  mp4: 'audio/mp4',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  webm: 'audio/webm',
}

type R2Config = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicBaseUrl: string
}

let client: S3Client | null = null

function readEnv(name: string) {
  if (!process.env[name]) {
    process.env[name] = viteEnv[name]
  }

  return process.env[name]?.trim()
}

function getR2Config(): R2Config {
  const accountId = readEnv('R2_ACCOUNT_ID')
  const accessKeyId = readEnv('R2_ACCESS_KEY_ID')
  const secretAccessKey = readEnv('R2_SECRET_ACCESS_KEY')
  const bucketName = readEnv('R2_BUCKET_NAME')
  const publicBaseUrl = readEnv('R2_PUBLIC_BASE_URL')

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucketName ||
    !publicBaseUrl
  ) {
    throw new Error(
      'Configuration Cloudflare R2 incomplete. Renseigne R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME et R2_PUBLIC_BASE_URL.',
    )
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl: publicBaseUrl.replace(/\/+$/, ''),
  }
}

function getR2Client() {
  if (client) {
    return client
  }

  const { accountId, accessKeyId, secretAccessKey } = getR2Config()

  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  return client
}

function slugifySegment(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getFileExtension(file: File) {
  const fromName = extname(file.name).replace('.', '').toLowerCase()
  if (fromName && ALLOWED_EXTENSIONS.has(fromName)) {
    return fromName
  }

  const fromMime = file.type.split('/').at(1)?.toLowerCase()
  if (fromMime === 'mpeg') {
    return 'mp3'
  }

  if (fromMime === 'x-m4a') {
    return 'm4a'
  }

  if (fromMime && ALLOWED_EXTENSIONS.has(fromMime)) {
    return fromMime
  }

  return null
}

function getContentType(file: File, extension: string) {
  if (file.type.startsWith('audio/')) {
    return file.type
  }

  return MIME_BY_EXTENSION[extension] ?? 'audio/mpeg'
}

export async function uploadAudioToR2(file: File) {
  if (!(file instanceof File)) {
    throw new Error('Fichier audio invalide.')
  }

  if (file.size <= 0) {
    throw new Error('Le fichier audio est vide.')
  }

  if (file.size > MAX_AUDIO_SIZE_BYTES) {
    throw new Error('Le fichier audio depasse 25 Mo.')
  }

  const extension = getFileExtension(file)
  if (!extension) {
    throw new Error(
      'Format audio non supporte. Utilise mp3, wav, m4a, ogg, flac, aac ou webm.',
    )
  }

  if (file.type && !file.type.startsWith('audio/')) {
    throw new Error('Le fichier selectionne n est pas un audio.')
  }

  const { bucketName, publicBaseUrl } = getR2Config()
  const key = [
    AUDIO_PREFIX,
    new Date().toISOString().slice(0, 10),
    `${slugifySegment(file.name.replace(/\.[^.]+$/, '')) || 'audio'}-${randomUUID()}.${extension}`,
  ].join('/')

  const buffer = Buffer.from(await file.arrayBuffer())

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: getContentType(file, extension),
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )

  return {
    key,
    url: `${publicBaseUrl}/${key}`,
  }
}

export async function deleteAudioFromR2(key: string) {
  if (!key) {
    return
  }

  const { bucketName } = getR2Config()

  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  )
}
