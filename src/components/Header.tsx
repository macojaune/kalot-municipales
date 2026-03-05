import { Link, useRouterState } from '@tanstack/react-router'
import { MapPin, ShieldCheck } from 'lucide-react'
import ClerkHeader from '../integrations/clerk/header-user'
import { MegaphoneTwinIcon } from './brand-icons'

const links = [
  { to: '/', label: 'Accueil' },
  { to: '/duel', label: 'Duel' },
  { to: '/leaderboard', label: 'Classement' },
]

export default function Header() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <header className="desktop-header">
      <div className="desktop-header__inner">
        <Link
          to="/"
          className="brand-pill"
          aria-label="KalotMunicipales accueil"
        >
          <MegaphoneTwinIcon size={26} />
          <span>KalotMunicipales</span>
        </Link>

        <nav className="desktop-nav" aria-label="Navigation principale desktop">
          {links.map((link) => {
            const active =
              pathname === link.to ||
              (link.to === '/duel' && pathname === '/results')

            return (
              <Link
                key={link.to}
                to={link.to}
                className={`desktop-nav__link ${active ? 'is-active' : ''}`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="desktop-header__right">
          <span className="region-badge" title="Region active">
            <MapPin size={14} />
            Guadeloupe
          </span>
          <span className="region-badge" title="Moderation active">
            <ShieldCheck size={14} />
            Moderation
          </span>
          <ClerkHeader />
        </div>
      </div>
    </header>
  )
}
