import { Link, useRouterState } from '@tanstack/react-router'
import { Music2, Trophy } from 'lucide-react'
import { MegaphoneTwinIcon } from './brand-icons'

const items = [
  { to: '/', label: 'Accueil', kind: 'home' as const },
  { to: '/duel', label: 'Duel', kind: 'duel' as const },
  { to: '/leaderboard', label: 'Classement', kind: 'rank' as const },
]

export default function MobileNav() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <nav className="mobile-nav" aria-label="Navigation principale mobile">
      {items.map((item) => {
        const active =
          pathname === item.to ||
          (item.to === '/duel' && pathname === '/results')

        return (
          <Link
            key={item.to}
            to={item.to}
            className={`mobile-nav__item ${active ? 'is-active' : ''}`}
          >
            {item.kind === 'home' ? <MegaphoneTwinIcon size={20} /> : null}
            {item.kind === 'duel' ? (
              <Music2 size={20} strokeWidth={2.2} />
            ) : null}
            {item.kind === 'rank' ? (
              <Trophy size={20} strokeWidth={2.2} />
            ) : null}
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
