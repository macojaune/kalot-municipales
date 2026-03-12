import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'
import { useRegion } from '../context/RegionContext'
import {
  buildRegionHref,
  getRegionFromPathname,
  shouldUseRegionPrefix,
} from '../lib/region-routing'
import { RegionSelector } from './RegionSelector'

export function RegionRoutingBoundary({
  children,
}: {
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  const { region, setRegion } = useRegion()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  const regionFromUrl = useMemo(
    () => getRegionFromPathname(pathname),
    [pathname],
  )
  const requiresRegionPrefix = useMemo(
    () => shouldUseRegionPrefix(pathname),
    [pathname],
  )

  useEffect(() => {
    if (regionFromUrl && region !== regionFromUrl) {
      setRegion(regionFromUrl)
    }
  }, [region, regionFromUrl, setRegion])

  useEffect(() => {
    if (
      !requiresRegionPrefix ||
      regionFromUrl ||
      !region ||
      typeof window === 'undefined'
    ) {
      return
    }

    void navigate({
      to: buildRegionHref(
        region,
        pathname,
        window.location.search,
        window.location.hash,
      ),
      replace: true,
    })
  }, [navigate, pathname, region, regionFromUrl, requiresRegionPrefix])

  if (!requiresRegionPrefix) {
    return <>{children}</>
  }

  if (!regionFromUrl && !region) {
    return (
      <RegionSelector
        onSelect={(nextRegion) => {
          const search =
            typeof window === 'undefined' ? '' : window.location.search
          const hash = typeof window === 'undefined' ? '' : window.location.hash

          void navigate({
            to: buildRegionHref(nextRegion, pathname, search, hash),
            replace: true,
          })
        }}
      />
    )
  }

  if (!regionFromUrl && region) {
    return null
  }

  return <>{children}</>
}
