import type { ReactNode } from 'react'
import { useRegion } from '../context/RegionContext'
import { BottomNav } from './BottomNav'
import { RegionSelector } from './RegionSelector'
import { TopNav } from './TopNav'

export function Layout({ children }: { children: ReactNode }) {
  const { region } = useRegion()

  if (!region) {
    return <RegionSelector />
  }

  return (
    <div className="min-h-screen bg-background text-foreground text-grain">
      <TopNav />
      <main className="pb-20 md:pb-0">{children}</main>
      <BottomNav />
    </div>
  )
}
