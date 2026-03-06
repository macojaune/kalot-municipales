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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary/25 bg-background/95 backdrop-blur-md md:hidden">
      <div className="flex items-center justify-around h-16 px-1">
        {tabs.map((tab) => {
          const active =
            pathname === tab.to ||
            (tab.to === '/duel' && pathname === '/results')
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`mx-1 flex h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-md border transition-all ${
                active
                  ? 'text-primary border-primary/65 bg-primary/10 box-glow-green'
                  : 'text-muted-foreground border-transparent bg-transparent'
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-display leading-none tracking-wider">
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
