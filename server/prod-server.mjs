import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { access, readdir } from 'node:fs/promises'
import { basename, dirname, extname, join, normalize } from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'

import app from '../dist/server/server.js'

const host = process.env.HOST || '0.0.0.0'
const port = Number(process.env.PORT || 3000)
const clientDistDir = fileURLToPath(new URL('../dist/client', import.meta.url))
const staticContentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.vtt': 'text/vtt; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
}

async function resolveAppStylesheetPath() {
  const assetDirectory = join(clientDistDir, 'assets')

  try {
    const assetEntries = await readdir(assetDirectory)
    const stylesheetEntry =
      assetEntries.find((entry) => entry.startsWith('main-') && entry.endsWith('.css')) ||
      assetEntries.find((entry) => entry.startsWith('styles-') && entry.endsWith('.css')) ||
      assetEntries.find((entry) => entry.endsWith('.css'))

    return stylesheetEntry ? join(assetDirectory, stylesheetEntry) : null
  } catch {
    return null
  }
}

function toRequestHeaders(nodeHeaders) {
  const headers = new Headers()

  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        headers.append(key, entry)
      }
      continue
    }

    if (typeof value === 'string') {
      headers.set(key, value)
    }
  }

  return headers
}

function getRequestBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return undefined
  }

  return Readable.toWeb(req)
}

function getStaticContentType(pathname) {
  return staticContentTypes[extname(pathname).toLowerCase()] || 'application/octet-stream'
}

async function getStaticFilePath(url) {
  if (url.pathname === '/') {
    return null
  }

  if (url.pathname === '/app.css') {
    return resolveAppStylesheetPath()
  }

  const normalizedPath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.(\/|\\|$))+/, '')
  const relativePath = normalizedPath.replace(/^[/\\]+/, '')
  const filePath = join(clientDistDir, relativePath)

  if (!filePath.startsWith(clientDistDir)) {
    return null
  }

  try {
    await access(filePath)
    return filePath
  } catch {
    if (!relativePath.startsWith('assets/')) {
      return null
    }

    const assetExtension = extname(relativePath)
    const assetBasename = basename(relativePath, assetExtension)
    const hashedAssetMatch = assetBasename.match(/^(.*)-[A-Za-z0-9_-]+$/)

    if (!hashedAssetMatch?.[1]) {
      return null
    }

    try {
      const assetDirectory = dirname(filePath)
      const assetStem = hashedAssetMatch[1]
      const fallbackEntry = (await readdir(assetDirectory)).find((entry) => {
        return entry.startsWith(`${assetStem}-`) && entry.endsWith(assetExtension)
      })

      if (!fallbackEntry) {
        return null
      }

      return join(assetDirectory, fallbackEntry)
    } catch {
      return null
    }
  }
}

const server = createServer(async (req, res) => {
  const abortController = new AbortController()

  req.on('close', () => {
    abortController.abort()
  })

  try {
    const origin = `http://${req.headers.host || 'localhost'}`
    const url = new URL(req.url || '/', origin)
    const staticFilePath = await getStaticFilePath(url)

    if (staticFilePath && (req.method === 'GET' || req.method === 'HEAD')) {
      res.statusCode = 200
      res.setHeader('content-type', getStaticContentType(staticFilePath))

      if (staticFilePath.includes(`${clientDistDir}/assets/`)) {
        res.setHeader('cache-control', 'public, max-age=31536000, immutable')
      }

      if (req.method === 'HEAD') {
        res.end()
        return
      }

      createReadStream(staticFilePath).pipe(res)
      return
    }

    const request = new Request(url, {
      method: req.method,
      headers: toRequestHeaders(req.headers),
      body: getRequestBody(req),
      duplex: 'half',
      signal: abortController.signal,
    })

    const response = await app.fetch(request)

    res.statusCode = response.status

    response.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })

    if (!response.body || req.method === 'HEAD') {
      res.end()
      return
    }

    Readable.fromWeb(response.body).pipe(res)
  } catch (error) {
    console.error('KalotMunicipales server error', error)

    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('content-type', 'text/plain; charset=utf-8')
    }

    res.end('Internal Server Error')
  }
})

server.listen(port, host, () => {
  console.log(`KalotMunicipales listening on http://${host}:${port}`)
})
