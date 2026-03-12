import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useRegionPath } from '../lib/region-routing'
import { RegionSwitcher } from './RegionSwitcher'
import { SpeakerGrillPattern } from './soundsystem/SpeakerGrillPattern'

type LayoutProps = {
  children: ReactNode
  hideHeader?: boolean
  backTo?: string | null
  backLabel?: string
  headerRight?: ReactNode
}

export function Layout({
  children,
  hideHeader = false,
  backTo = '/',
  backLabel = 'Retour',
  headerRight,
}: LayoutProps) {
  const homeHref = useRegionPath('/')
  const backHref = useRegionPath(backTo ?? '/')

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground text-grain">
      <SpeakerGrillPattern />

      {hideHeader ? (
        <div className="absolute right-4 top-4 z-30">
          <RegionSwitcher />
        </div>
      ) : null}

      {hideHeader ? null : (
        <header className="sticky top-0 z-40 border-b border-primary/25 bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <div className="flex min-w-0 items-center gap-3">
              {backTo ? (
                <a
                  href={backHref}
                  className="inline-flex items-center gap-1 text-xs font-display tracking-wider text-muted-foreground transition-colors hover:text-primary"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {backLabel}
                </a>
              ) : null}

              <a
                href={homeHref}
                className="font-display text-2xl font-bold tracking-tight whitespace-nowrap"
              >
                <span className="text-foreground text-glow-white">KALOT</span>
                <span className="text-primary text-glow-green">MUNICIPALES</span>
              </a>
            </div>

            <div className="flex items-center justify-end gap-2">
              <RegionSwitcher compact />
              {headerRight}
            </div>
          </div>
        </header>
      )}

      <main className="relative z-10">{children}</main>
    </div>
  )
}
