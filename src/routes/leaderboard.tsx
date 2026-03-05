import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import { CrownIcon } from '../components/icons/CrownIcon'
import { getJson } from '../lib/kalot-client'
import type { LeaderboardResponse } from '../lib/kalot-client'
import type { Region } from '../types/song'
import { COMMUNES, REGION_LABELS, getRegionForCommune } from '../types/song'

export const Route = createFileRoute('/leaderboard')({
  component: LeaderboardPage,
})

function LeaderboardPage() {
  const [activeRegion, setActiveRegion] = useState<Region>('guadeloupe')
  const [commune, setCommune] = useState('')

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', 'full-table'],
    queryFn: () => getJson<LeaderboardResponse>('/api/leaderboard?limit=500'),
    refetchInterval: 15000,
  })

  const songs = useMemo(() => {
    const rows = Array.isArray(leaderboardQuery.data?.leaderboard)
      ? leaderboardQuery.data.leaderboard
      : []

    const regionRows = rows.filter(
      (song) => getRegionForCommune(song.communeName) === activeRegion,
    )

    if (!commune) {
      return regionRows.sort((a, b) => b.rating - a.rating)
    }

    return regionRows
      .filter((song) => song.communeName === commune)
      .sort((a, b) => b.rating - a.rating)
  }, [activeRegion, commune, leaderboardQuery.data?.leaderboard])

  const regions: Region[] = ['guadeloupe', 'martinique', 'guyane']

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 animate-fade-in">
        <h1 className="font-display font-black text-2xl flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          Classement
        </h1>

        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {regions.map((region) => (
            <button
              key={region}
              type="button"
              onClick={() => {
                setActiveRegion(region)
                setCommune('')
              }}
              className={`flex-1 py-2 rounded-lg font-body text-sm font-medium transition-all ${
                activeRegion === region
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {REGION_LABELS[region]}
            </button>
          ))}
        </div>

        <select
          value={commune}
          onChange={(event) => setCommune(event.target.value)}
          className="w-full p-3 rounded-xl bg-card border border-border font-body text-sm text-foreground min-h-[44px]"
        >
          <option value="">Toutes les communes</option>
          {COMMUNES[activeRegion].map((communeName) => (
            <option key={communeName} value={communeName}>
              {communeName}
            </option>
          ))}
        </select>

        {songs.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <DoubleMegaphonePlaceholder />
            <p className="text-muted-foreground font-body">
              Pas encore de sons pour cette region
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {songs.map((song, index) => (
              <div
                key={song.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  index < 3
                    ? 'bg-card border-primary/30 shadow-sm'
                    : 'bg-card border-border'
                }`}
              >
                <span className="font-display font-black text-lg w-8 text-center shrink-0">
                  {index === 0 ? (
                    <CrownIcon className="w-6 h-6 mx-auto" />
                  ) : (
                    index + 1
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm truncate">
                    {song.title}
                  </p>
                  <p className="text-xs text-muted-foreground font-body truncate">
                    {song.artistName} · {song.communeName}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="tabular font-display font-bold text-sm text-primary">
                    {Math.round(song.rating)}
                  </p>
                  <p className="tabular text-[10px] text-muted-foreground font-body">
                    {song.wins}W / {song.losses}L
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

function DoubleMegaphonePlaceholder() {
  return (
    <div className="w-16 h-16 mx-auto opacity-30" aria-hidden="true">
      <svg viewBox="0 0 64 64" fill="none">
        <title>Placeholder megaphone</title>
        <path d="M8 28L24 20V44L8 36V28Z" fill="currentColor" opacity="0.5" />
        <path d="M56 28L40 20V44L56 36V28Z" fill="currentColor" opacity="0.5" />
      </svg>
    </div>
  )
}
