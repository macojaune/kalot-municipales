import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { Layout } from '../components/Layout'
import { getJson } from '../lib/kalot-client'
import type { LeaderboardResponse } from '../lib/kalot-client'
import clsx from 'clsx'

export const Route = createFileRoute('/classement')({
  component: LeaderboardPage,
})

function LeaderboardPage() {
  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', 'full-table'],
    queryFn: () => getJson<LeaderboardResponse>('/api/leaderboard?limit=500'),
    refetchInterval: 15000,
  })

  const songs = useMemo(
    () =>
      Array.isArray(leaderboardQuery.data?.leaderboard)
        ? leaderboardQuery.data.leaderboard
        : [],
    [leaderboardQuery.data?.leaderboard],
  )

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-6 md:py-8 space-y-5 animate-fade-in">
        <section className="rounded-2xl border border-secondary/35 bg-card/70 p-4 md:p-6">
          <h1 className="font-display text-3xl text-secondary text-glow-blue flex items-center gap-2">
            <Trophy className="w-7 h-7" />
            Classement general
          </h1>
        </section>

        {songs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card/70 p-8 text-center text-muted-foreground">
            Pas de classement pour le moment.
          </div>
        ) : (
          <section className="space-y-3">
            {songs.map((song, index) => {
              const medalColor =
                index === 0
                  ? 'text-primary text-glow-green'
                  : index === 1
                    ? 'text-secondary text-glow-blue'
                    : index === 2
                      ? 'text-accent text-glow-orange'
                      : 'text-muted-foreground'

              const borderTone =
                index === 0
                  ? 'border-primary/45 box-glow-green'
                  : index === 1
                    ? 'border-secondary/45 box-glow-blue'
                    : index === 2
                      ? 'border-accent/45 box-glow-orange'
                      : 'border-border'

              return (
                <div
                  key={song.id}
                  className={`neon-panel relative overflow-hidden rounded-xl border px-4 py-3 md:py-4 flex items-center gap-3 ${borderTone}`}
                >
                  <div className={`w-8 text-center font-display text-2xl ${medalColor}`}>
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className='flex flex-row gap-4'><p className="font-display text-xl font-semibold text-foreground truncate">
                      {song.title}
                    </p>
                      <span className={clsx(["text-sm", medalColor])}>{song.communeName}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {song.listName}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="tabular font-display text-xl text-foreground">
                      {Math.round(song.rating)}
                    </p>
                    <p className="text-[10px] font-display text-muted-foreground tracking-widest">
                      POINTS
                    </p>
                  </div>
                </div>
              )
            })}
          </section>
        )}
      </div>
    </Layout>
  )
}
