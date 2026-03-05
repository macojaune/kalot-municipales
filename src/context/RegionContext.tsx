import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import type { Region } from '../types/song'

const REGION_KEY = 'kalot_region'

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

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [region, setRegionState] = useState<Region | null>(getInitialRegion)

  const setRegion = useCallback((nextRegion: Region) => {
    setRegionState(nextRegion)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(REGION_KEY, nextRegion)
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
