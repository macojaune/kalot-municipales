import { useRouterState } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useRegion } from '../context/RegionContext'
import type { Region } from '../types/song'

export type RegionCode = 'gp' | 'mq' | 'gf'

const REGION_TO_CODE: Record<Region, RegionCode> = {
  guadeloupe: 'gp',
  martinique: 'mq',
  guyane: 'gf',
}

const CODE_TO_REGION: Record<RegionCode, Region> = {
  gp: 'guadeloupe',
  mq: 'martinique',
  gf: 'guyane',
}

const REGION_REQUIRED_PATHS = new Set([
  '/',
  '/duel',
  '/classement',
  '/blindtest',
  '/blindtest/resultats',
  '/results',
  '/ajouter-son',
])

export function normalizePathname(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/'
  }

  const trimmed = pathname.trim()
  if (!trimmed || trimmed === '/') {
    return '/'
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeadingSlash.replace(/\/+$/, '') || '/'
}

export function getRegionCode(region: Region): RegionCode {
  return REGION_TO_CODE[region]
}

export function getRegionFromCode(code: string): Region | null {
  return Object.prototype.hasOwnProperty.call(CODE_TO_REGION, code)
    ? CODE_TO_REGION[code as RegionCode]
    : null
}

export function getRegionFromPathname(pathname: string): Region | null {
  const normalizedPathname = normalizePathname(pathname)
  const [, maybeCode] = normalizedPathname.split('/')

  if (!maybeCode) {
    return null
  }

  return getRegionFromCode(maybeCode)
}

export function stripRegionPrefix(pathname: string) {
  const normalizedPathname = normalizePathname(pathname)
  const segments = normalizedPathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return '/'
  }

  if (!getRegionFromCode(segments[0] ?? '')) {
    return normalizedPathname
  }

  const rest = segments.slice(1)
  return rest.length > 0 ? `/${rest.join('/')}` : '/'
}

export function shouldUseRegionPrefix(pathname: string) {
  const strippedPathname = stripRegionPrefix(pathname)
  return REGION_REQUIRED_PATHS.has(strippedPathname)
}

export function buildRegionPath(region: Region, path = '/') {
  const normalizedPath = stripRegionPrefix(path)
  const prefix = `/${getRegionCode(region)}`

  return normalizedPath === '/' ? prefix : `${prefix}${normalizedPath}`
}

export function buildRegionHref(
  region: Region,
  pathname = '/',
  search = '',
  hash = '',
) {
  return `${buildRegionPath(region, pathname)}${search}${hash}`
}

export function useResolvedRegion() {
  const { region } = useRegion()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return useMemo(
    () => getRegionFromPathname(pathname) ?? region,
    [pathname, region],
  )
}

export function useRegionPath(path = '/') {
  const resolvedRegion = useResolvedRegion()

  return useMemo(() => {
    if (!resolvedRegion) {
      return stripRegionPrefix(path)
    }

    return buildRegionPath(resolvedRegion, path)
  }, [path, resolvedRegion])
}
