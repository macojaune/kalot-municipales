import { useUser } from '@clerk/clerk-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Share2, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DoubleMegaphone } from '../components/icons/DoubleMegaphone'
import { FistIcon } from '../components/icons/FistIcon'
import { MusicNoteIcon } from '../components/icons/MusicNoteIcon'
import { Layout } from '../components/Layout'
import { CrownIcon } from '../components/icons/CrownIcon'
import { useRegion } from '../context/RegionContext'
import {
  getDisplayName,
  getExternalUserId,
  getJson,
  postJson,
  setActiveSessionId,
} from '../lib/kalot-client'
import type {
  LeaderboardResponse,
  StartSessionResponse,
} from '../lib/kalot-client'
import { getRegionForCommune } from '../types/song'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { region } = useRegion()
  const [feedback, setFeedback] = useState<string | null>(null)

  const externalUserId = getExternalUserId(user)
  const displayName = getDisplayName(user)

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', 'home-full'],
    queryFn: () => getJson<LeaderboardResponse>('/api/leaderboard?limit=200'),
    refetchInterval: 15000,
  })

  const songsByRegion = useMemo(() => {
    const rows = Array.isArray(leaderboardQuery.data?.leaderboard)
      ? leaderboardQuery.data.leaderboard
      : []

    if (!region) {
      return rows
    }

    return rows.filter(
      (song) => getRegionForCommune(song.communeName) === region,
    )
  }, [leaderboardQuery.data?.leaderboard, region])

  const top3 = useMemo(
    () => [...songsByRegion].sort((a, b) => b.rating - a.rating).slice(0, 3),
    [songsByRegion],
  )

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      if (!externalUserId) {
        throw new Error('Utilisateur non connecte.')
      }

      return postJson<StartSessionResponse>('/api/vote/start', {
        externalUserId,
        username: displayName,
      })
    },
    onSuccess: async (response) => {
      if (!response.ok) {
        setFeedback(response.message)
        return
      }

      setActiveSessionId(response.sessionId)
      setFeedback(null)
      await navigate({ to: '/duel' })
    },
    onError: (error) => {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Impossible de lancer un duel.',
      )
    },
  })

  function handleStart() {
    if (songsByRegion.length < 2) {
      setFeedback('Il faut au moins 2 sons pour lancer un duel.')
      return
    }

    void startSessionMutation.mutate()
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-8 space-y-10 animate-fade-in">
        <div className="text-center space-y-4">
          <DoubleMegaphone className="w-20 h-20 mx-auto" animate />
          <h1 className="text-4xl md:text-5xl font-display font-black text-foreground leading-tight">
            Kalòt'Municipales
          </h1>
          <p className="text-muted-foreground font-body text-base max-w-xs mx-auto">
            Vote pour la meilleure chanson de campagne 2026.
          </p>
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={startSessionMutation.isPending}
          className="w-full py-5 rounded-xl bg-primary text-primary-foreground font-display font-bold text-xl
            hover:brightness-105 active:scale-[0.97] transition-all shadow-lg
            flex items-center justify-center gap-3 min-h-[56px]"
        >
          {startSessionMutation.isPending
            ? 'Lancement…'
            : "Entrer dans l'isoloir"}
        </button>

        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            {
              icon: <MusicNoteIcon className="w-8 h-8 mx-auto" />,
              label: 'Ecoute',
            },
            { icon: <FistIcon className="w-8 h-8 mx-auto" />, label: 'Vote' },
            {
              icon: (
                <Share2 className="w-8 h-8 mx-auto text-muted-foreground" />
              ),
              label: 'Partage',
            },
          ].map((step) => (
            <div key={step.label} className="space-y-2">
              {step.icon}
              <p className="font-display font-bold text-sm text-foreground">
                {step.label}
              </p>
            </div>
          ))}
        </div>

        {top3.length > 0 ? (
          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Top classement
            </h2>
            {top3.map((song, index) => (
              <div
                key={song.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
              >
                <span className="font-display font-black text-lg text-primary w-7 text-center">
                  {index === 0 ? (
                    <CrownIcon className="w-5 h-5 mx-auto" />
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
                <span className="tabular text-xs font-body text-muted-foreground">
                  {Math.round(song.rating)} points
                </span>
              </div>
            ))}
          </section>
        ) : null}

        <div className="flex items-center justify-center pt-4 border-t border-border text-sm">
          <Link
            to="/leaderboard"
            className="font-body text-muted-foreground hover:text-foreground transition-colors min-h-[44px] px-2"
          >
            Voir le classement complet
          </Link>
        </div>

        {feedback ? (
          <p
            aria-live="polite"
            className="text-sm text-muted-foreground font-body"
          >
            {feedback}
          </p>
        ) : null}
      </div>
    </Layout>
  )
}
