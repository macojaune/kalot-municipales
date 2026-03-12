import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react'
import type { Region } from '../types/song'

const REGION_KEY = 'kalot_region'
const regionListeners = new Set<() => void>()

type RegionContextValue = {
  region: Region | null
  setRegion: (nextRegion: Region) => void
}

const RegionContext = createContext<RegionContextValue>({
  region: null,
  setRegion: () => {},
})

function getInitialRegion(): Region | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(REGION_KEY)
  if (raw === 'guadeloupe' || raw === 'martinique' || raw === 'guyane') {
    return raw
  }

  return null
}

function emitRegionChange() {
  for (const listener of regionListeners) {
    listener()
  }
}

function subscribeToRegionStore(onStoreChange: () => void) {
  regionListeners.add(onStoreChange)

  if (typeof window === 'undefined') {
    return () => {
      regionListeners.delete(onStoreChange)
    }
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === REGION_KEY) {
      onStoreChange()
    }
  }

  window.addEventListener('storage', handleStorage)

  return () => {
    regionListeners.delete(onStoreChange)
    window.removeEventListener('storage', handleStorage)
  }
}

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const region = useSyncExternalStore(
    subscribeToRegionStore,
    getInitialRegion,
    () => null,
  )

  const setRegion = useCallback((nextRegion: Region) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(REGION_KEY, nextRegion)
      emitRegionChange()
    }
  }, [])

  const value = useMemo(
    () => ({
      region,
      setRegion,
    }),
    [region, setRegion],
  )

  return (
    <RegionContext.Provider value={value}>{children}</RegionContext.Provider>
  )
}

export function useRegion() {
  return useContext(RegionContext)
}
