type CacheEntry = {
  expiresAt: number
  value: unknown
}

const cacheStore = new Map<string, CacheEntry>()
const inFlightLoads = new Map<string, Promise<unknown>>()

export async function getOrSetServerCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
) {
  const now = Date.now()
  const cached = cacheStore.get(key)

  if (cached && cached.expiresAt > now) {
    return cached.value as T
  }

  const pending = inFlightLoads.get(key)
  if (pending) {
    return pending as Promise<T>
  }

  const loadPromise = (async () => {
    try {
      const value = await loader()
      cacheStore.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      })
      return value
    } finally {
      inFlightLoads.delete(key)
    }
  })()

  inFlightLoads.set(key, loadPromise)
  return loadPromise
}

export function invalidateServerCache(prefix?: string) {
  if (!prefix) {
    cacheStore.clear()
    inFlightLoads.clear()
    return
  }

  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key)
    }
  }

  for (const key of inFlightLoads.keys()) {
    if (key.startsWith(prefix)) {
      inFlightLoads.delete(key)
    }
  }
}
