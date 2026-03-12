import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Check, ChevronDown, MapPin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useRegion } from '../context/RegionContext'
import {
  buildRegionHref,
  shouldUseRegionPrefix,
  useResolvedRegion,
} from '../lib/region-routing'
import { REGION_LABELS, type Region } from '../types/song'

const REGION_OPTIONS: Array<{
  id: Region
  dotClassName: string
  hoverClassName: string
}> = [
  {
    id: 'guadeloupe',
    dotClassName: 'bg-primary',
    hoverClassName: 'hover:border-primary/60 hover:bg-primary/10',
  },
  {
    id: 'martinique',
    dotClassName: 'bg-secondary',
    hoverClassName: 'hover:border-secondary/60 hover:bg-secondary/10',
  },
  {
    id: 'guyane',
    dotClassName: 'bg-victory',
    hoverClassName: 'hover:border-victory/60 hover:bg-victory/10',
  },
]

function getDotClassName(region: Region | null) {
  return (
    REGION_OPTIONS.find((option) => option.id === region)?.dotClassName ??
    'bg-muted-foreground'
  )
}

export function RegionSwitcher({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const resolvedRegion = useResolvedRegion()
  const { setRegion } = useRegion()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  function handleSelect(nextRegion: Region) {
    setRegion(nextRegion)
    setIsOpen(false)

    if (typeof window === 'undefined') {
      return
    }

    const nextPathname = shouldUseRegionPrefix(pathname) ? pathname : '/'

    void navigate({
      to: buildRegionHref(
        nextRegion,
        nextPathname,
        window.location.search,
        window.location.hash,
      ),
      replace: false,
    })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`group inline-flex items-center gap-2 rounded-full border border-border bg-card/85 text-foreground shadow-[0_8px_30px_rgba(0,0,0,0.28)] backdrop-blur-md transition-all hover:border-primary/45 hover:text-primary ${
          compact ? 'min-h-10 px-3 text-xs' : 'min-h-11 px-4 text-sm'
        }`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Changer de region"
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${getDotClassName(resolvedRegion)}`}
        />
        <span className="font-display tracking-[0.14em]">
          {resolvedRegion ? REGION_LABELS[resolvedRegion] : 'Choisir region'}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen ? (
        <div
          className={`absolute right-0 z-50 mt-3 w-56 rounded-2xl border border-border bg-background/95 p-2 shadow-[0_18px_48px_rgba(0,0,0,0.42)] backdrop-blur-xl ${
            compact ? 'w-52' : 'w-56'
          }`}
          role="menu"
          aria-label="Liste des regions"
        >
          <div className="mb-2 flex items-center gap-2 px-3 pt-2 text-[11px] font-display tracking-[0.22em] text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            Region active
          </div>

          <div className="space-y-1">
            {REGION_OPTIONS.map((option) => {
              const isActive = option.id === resolvedRegion

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
                    isActive
                      ? 'border-foreground/15 bg-foreground/8 text-foreground'
                      : `border-transparent text-muted-foreground ${option.hoverClassName}`
                  }`}
                  role="menuitemradio"
                  aria-checked={isActive}
                >
                  <span
                    className={`h-3 w-3 rounded-full ${option.dotClassName} shrink-0`}
                  />
                  <span className="flex-1 font-body text-sm">
                    {REGION_LABELS[option.id]}
                  </span>
                  {isActive ? <Check className="h-4 w-4 text-primary" /> : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
