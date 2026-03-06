import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import { getJson } from '../lib/kalot-client'
import type { ElectionRound, LeaderboardResponse } from '../lib/kalot-client'
import { COMMUNES } from '../types/song'

export const Route = createFileRoute('/leaderboard')({
  component: LeaderboardPage,
})

const FILTERS = ['Tous', ...COMMUNES.guadeloupe]

function LeaderboardPage() {
  const [activeFilter, setActiveFilter] = useState('Tous')

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', 'full-table', activeFilter],
    queryFn: () =>
      getJson<LeaderboardResponse>(
        `/api/leaderboard?limit=500${
          activeFilter !== 'Tous' ? `&commune=${encodeURIComponent(slugify(activeFilter))}` : ''
        }`,
      ),
    refetchInterval: 15000,
  })

  const songs = useMemo(
    () =>
      Array.isArray(leaderboardQuery.data?.leaderboard)
        ? leaderboardQuery.data.leaderboard
        : [],
    [leaderboardQuery.data?.leaderboard],
  )

  const electionRound: ElectionRound = songs.at(0)?.electionRound ?? 'round1'

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-6 md:py-8 space-y-5 animate-fade-in">
        <section className="rounded-2xl border border-secondary/35 bg-card/70 p-4 md:p-6">
          <h1 className="font-display text-3xl text-secondary text-glow-blue flex items-center gap-2">
            <Trophy className="w-7 h-7" />
            {electionRound === 'round1' ? 'Classement communal' : 'Classement final'}
          </h1>

          {electionRound === 'round1' ? (
            <div className="mt-4">
              <label htmlFor="commune-filter" className="sr-only">
                Filtrer par commune
              </label>
              <select
                id="commune-filter"
                value={activeFilter}
                onChange={(event) => setActiveFilter(event.target.value)}
                className="h-12 w-full rounded-md border border-border bg-background px-3 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {FILTERS.map((filter) => (
                  <option key={filter} value={filter}>
                    {filter === 'Tous' ? 'Toutes les communes' : filter}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="mt-4 font-body text-sm text-muted-foreground">
              Second tour entre les sons arrives #1 dans chaque commune.
            </p>
          )}
        </section>

        {songs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card/70 p-8 text-center text-muted-foreground">
            Aucun son trouve pour ce filtre.
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
                    <p className="font-display text-lg text-foreground truncate">
                      {song.title}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {song.artistName} - {song.communeName}
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}
