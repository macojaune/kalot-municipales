import { Link, useRouterState } from '@tanstack/react-router'
import { DoubleMegaphone } from './icons/DoubleMegaphone'
import { useRegion } from '../context/RegionContext'
import { REGION_LABELS } from '../types/song'

const navItems = [
  { to: '/', label: 'Accueil' },
  { to: '/duel', label: 'Duel' },
  { to: '/classement', label: 'Classement' },
]

export function TopNav() {
  const { region } = useRegion()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <header className="hidden md:flex items-center justify-between px-6 py-3 bg-secondary text-secondary-foreground border-b border-border sticky top-0 z-50">
      <Link
        to="/"
        className="flex items-center gap-2 font-display font-black text-xl"
      >
        <DoubleMegaphone className="w-8 h-8" />
        <span>KalotMunicipales</span>
      </Link>

      <nav
        className="flex items-center gap-1"
        aria-label="Navigation principale desktop"
      >
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`px-4 py-2 rounded-lg font-body font-medium text-sm transition-colors ${pathname === item.to
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-secondary/80 text-secondary-foreground/80'
              }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {region ? (
        <span className="text-xs font-body bg-primary/20 text-primary-foreground px-3 py-1 rounded-full">
          {REGION_LABELS[region]}
        </span>
      ) : (
        <span className="text-xs font-body bg-primary/20 text-primary-foreground px-3 py-1 rounded-full">
          Choisis une region
        </span>
      )}
    </header>
  )
}
