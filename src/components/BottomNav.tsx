import { Link, useRouterState } from '@tanstack/react-router'
import { Trophy } from 'lucide-react'
import { DoubleMegaphone } from './icons/DoubleMegaphone'
import { MusicNoteIcon } from './icons/MusicNoteIcon'

const tabs = [
  { to: '/', label: 'Accueil', icon: <DoubleMegaphone className="w-6 h-6" /> },
  { to: '/duel', label: 'Duel', icon: <MusicNoteIcon className="w-6 h-6" /> },
  {
    to: '/leaderboard',
    label: 'Classement',
    icon: <Trophy className="w-6 h-6" />,
  },
]

export function BottomNav() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const active =
            pathname === tab.to ||
            (tab.to === '/duel' && pathname === '/results')
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-body font-medium">
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
