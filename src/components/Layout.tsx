import type { ReactNode } from 'react'
import { useRegion } from '../context/RegionContext'
import { BottomNav } from './BottomNav'
import { DoubleMegaphone } from './icons/DoubleMegaphone'
import { RegionSelector } from './RegionSelector'

export function Layout({ children }: { children: ReactNode }) {
  const { region } = useRegion()

  if (!region) {
    return <RegionSelector />
  }

  return (
    <div className="min-h-screen bg-background text-foreground text-grain">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-start gap-2">
          <DoubleMegaphone className="w-6 h-6" />
          <p className="font-display text-lg font-black tracking-wide">
            Kalot&apos;Municipales
          </p>
        </div>
      </header>
      <main className="pb-20 md:pb-0">{children}</main>
      <BottomNav />
    </div>
  )
}
