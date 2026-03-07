import { createFileRoute, Link } from '@tanstack/react-router'
import { Image, Link2, Share2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import { CrownIcon } from '../components/icons/CrownIcon'
import { NeonButton } from '../components/soundsystem/NeonButton'
import { trackEvent } from '../lib/analytics'
import { getLastSummary } from '../lib/kalot-client'
import { buildSeo } from '../lib/seo'

export const Route = createFileRoute('/results')({
  head: () =>
    buildSeo({
      title: 'Resultat de ta session de vote',
      description:
        'Retrouve le podium de ta session KalotMunicipales et partage ton top 3.',
      path: '/results',
      robots: 'noindex,nofollow',
    }),
  component: ResultsPage,
})

function ResultsPage() {
  const summary = getLastSummary()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isShareOpen, setIsShareOpen] = useState(false)

  const top3 = useMemo(() => {
    if (!summary?.scoreboard.length) {
      return []
    }

    return [...summary.scoreboard]
      .sort((a, b) => b.points - a.points)
      .slice(0, 3)
  }, [summary])

  const runnerUps = top3.slice(1)

  const siteUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return 'https://kalotmunicipales.fr'
    }

    return window.location.origin
  }, [])

  if (top3.length === 0) {
    return (
      <Layout>
        <div className="mx-auto max-w-lg space-y-4 px-4 py-20 text-center animate-fade-in">
          <p className="font-body text-muted-foreground">Aucun resultat disponible</p>
          <Link to="/" className="font-display text-primary hover:underline">
            Retour a l accueil
          </Link>
        </div>
      </Layout>
    )
  }

  const currentSummary = summary
  const currentChampion = top3[0]

  const title =
    'Ta chanson preferee'

  const subtitle = 'Voici le morceau que tu as propulse en tete de session.'

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(siteUrl)
      trackEvent('results_copy_link')
      setFeedback('Lien copie.')
      setIsShareOpen(false)
    } catch {
      setFeedback(siteUrl)
    }
  }

  function handleTwitterShare() {
    trackEvent('results_share_x')
    const text = buildShareText({
      championTitle: currentChampion.title,
      communeName: currentSummary.communeName,
      top3,
    })

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(siteUrl)}`
    window.open(twitterUrl, '_blank', 'noopener,noreferrer')
    setIsShareOpen(false)
  }

  function handleWhatsAppShare() {
    trackEvent('results_share_whatsapp')
    const text = `${buildShareText({
      championTitle: currentChampion.title,
      communeName: currentSummary.communeName,
      top3,
    })} ${siteUrl}`

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
    setIsShareOpen(false)
  }

  async function handleStoryImage() {
    try {
      trackEvent('results_share_story')
      const file = await createStoryImage({
        championTitle: currentChampion.title,
        communeName: currentSummary.communeName,
        top3,
      })

      const shareWithFiles =
        typeof navigator !== 'undefined' &&
        'share' in navigator &&
        'canShare' in navigator &&
        navigator.canShare({ files: [file] })

      if (shareWithFiles) {
        await navigator.share({
          files: [file],
          title: 'KalotMunicipales Story',
          text: 'Partage ton top 3 KalotMunicipales',
        })
      } else {
        const url = URL.createObjectURL(file)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = file.name
        anchor.click()
        URL.revokeObjectURL(url)
      }

      setFeedback('Visuel story genere.')
      setIsShareOpen(false)
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : 'Impossible de generer le visuel.',
      )
    }
  }

  return (
    <Layout>
      <div className="relative mx-auto max-w-3xl space-y-6 overflow-hidden px-4 py-8 animate-fade-in md:py-10">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20">
          <div className="h-[28rem] w-[28rem] rounded-full border border-accent/60 animate-ping [animation-duration:2.8s]" />
        </div>

        <section className="relative z-10 space-y-3 text-center">
          <CrownIcon className="mx-auto h-16 w-16 animate-badge-bounce" />
          <h1 className="font-display text-4xl text-accent text-glow-orange md:text-5xl">
            {title}
          </h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </section>

        <section className="relative z-10 rounded-2xl border border-accent/45 bg-card/80 p-6 text-center box-glow-orange md:p-8">
          <p className="font-display text-xs tracking-widest text-accent">#1 DE TA SESSION</p>
          <h2 className="mt-2 break-words font-display text-4xl text-foreground md:text-5xl">
            {currentChampion.title}
          </h2>
          {currentSummary.communeName ? (
            <p className="mt-2 font-display text-xs tracking-widest text-secondary">
              {currentSummary.communeName}
            </p>
          ) : null}
          <p className="mt-3 text-sm tabular text-muted-foreground">
            Score session: {currentChampion.points} points
          </p>
          <p className="mt-1 font-display text-xs tracking-widest text-muted-foreground">
            {currentSummary.roundsPlayed} DUELS JOUES
          </p>
        </section>

        {top3.length > 1 ? (
          <section className="relative z-10 space-y-2">
            <h3 className="font-display text-secondary text-glow-blue">
              Top 3 de ta session
            </h3>
            {runnerUps.map((song, index) => {
              const rank = index + 2
              const medalColor =
                rank === 2
                  ? 'text-secondary text-glow-blue'
                  : 'text-accent text-glow-orange'

              const borderTone =
                rank === 2
                  ? 'border-secondary/45 box-glow-blue'
                  : 'border-accent/45 box-glow-orange'

              return (
                <div
                  key={song.trackId}
                  className={`neon-panel flex items-center gap-3 rounded-lg border p-3 ${borderTone}`}
                >
                  <span className={`w-7 text-center font-display text-xl ${medalColor}`}>
                    {rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base text-foreground">
                      {song.title}
                    </p>
                    <p className="text-xs tabular text-muted-foreground">
                      {song.points} points
                    </p>
                  </div>
                </div>
              )
            })}
          </section>
        ) : null}

        <section className="relative z-10 flex flex-col gap-3">
          <Link
            to="/classement"
            onClick={() => {
              trackEvent('results_classement_click')
            }}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-[4px] border-2 border-secondary bg-transparent px-6 py-3 font-display text-base font-bold tracking-[0.08em] text-secondary transition-all duration-300 hover:bg-secondary hover:text-background hover:box-glow-blue active:scale-[0.97]"
          >
            Classement general
          </Link>

          <NeonButton
            color="orange"
            size="md"
            fullWidth
            onClick={() => {
              trackEvent('results_share_open')
              setIsShareOpen(true)
            }}
          >
            <Share2 className="h-5 w-5" />
            Partager
          </NeonButton>
        </section>

        {feedback ? (
          <p aria-live="polite" className="relative z-10 text-center text-sm text-accent">
            {feedback}
          </p>
        ) : null}

        {isShareOpen ? (
          <div className="absolute inset-0 z-30 flex items-end bg-black/70 p-4 backdrop-blur-sm md:items-center md:justify-center">
            <div className="neon-panel w-full max-w-xl rounded-2xl border border-accent/45 bg-card/95 p-4 box-glow-orange md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-xs tracking-[0.2em] text-accent">
                    Partager
                  </p>
                  <h2 className="mt-2 font-display text-3xl text-accent text-glow-orange">
                    Fais tourner ton top 3
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Choisis un reseau, copie le lien, ou genere un visuel story
                    pour Instagram / TikTok.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsShareOpen(false)}
                  className="rounded-full border border-border px-3 py-1 font-display text-[11px] tracking-widest text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                >
                  Fermer
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleTwitterShare}
                  className="rounded-xl border border-border bg-background/80 px-4 py-4 text-left transition-all hover:border-primary hover:bg-primary/10 hover:box-glow-green"
                >
                  <p className="font-display text-xl text-foreground">Twitter / X</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tweet prepare avec top 3 + lien du site
                  </p>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="rounded-xl border border-border bg-background/80 px-4 py-4 text-left transition-all hover:border-secondary hover:bg-secondary/10 hover:box-glow-blue"
                >
                  <p className="font-display text-xl text-foreground">WhatsApp</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Message pret a partager
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => void handleStoryImage()}
                  className="rounded-xl border border-border bg-background/80 px-4 py-4 text-left transition-all hover:border-accent hover:bg-accent/10 hover:box-glow-orange"
                >
                  <div className="flex items-center gap-2 font-display text-xl text-foreground">
                    <Image className="h-5 w-5" />
                    Story Instagram / TikTok
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Genere un visuel vertical a partager
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => void handleCopyLink()}
                  className="rounded-xl border border-border bg-background/80 px-4 py-4 text-left transition-all hover:border-white/50 hover:bg-white/5"
                >
                  <div className="flex items-center gap-2 font-display text-xl text-foreground">
                    <Link2 className="h-5 w-5" />
                    Copier le lien
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{siteUrl}</p>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  )
}

function buildShareText(input: {
  championTitle: string
  communeName: string | null
  top3: Array<{ title: string; points: number }>
}) {
  const podium = input.top3
    .map((song, index) => `${index + 1}. ${song.title} (${song.points} pts)`)
    .join(' | ')

  return input.communeName
    ? `Ma chanson preferee sur KalotMunicipales: ${input.championTitle}. Top 3: ${podium}. Vote aussi sur KalotMunicipales.`
    : `Ma chanson preferee sur KalotMunicipales: ${input.championTitle}. Top 3: ${podium}. Vote aussi sur KalotMunicipales.`
}

async function createStoryImage(input: {
  championTitle: string
  communeName: string | null
  top3: Array<{ title: string; points: number }>
}) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas indisponible.')
  }

  context.fillStyle = '#060606'
  context.fillRect(0, 0, canvas.width, canvas.height)

  const gradient = context.createRadialGradient(540, 520, 120, 540, 520, 760)
  gradient.addColorStop(0, 'rgba(57,255,20,0.22)')
  gradient.addColorStop(1, 'rgba(57,255,20,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.strokeStyle = 'rgba(57,255,20,0.16)'
  for (let x = 24; x < canvas.width; x += 24) {
    for (let y = 24; y < canvas.height; y += 24) {
      context.beginPath()
      context.arc(x, y, 2, 0, Math.PI * 2)
      context.stroke()
    }
  }

  context.fillStyle = '#ffffff'
  context.font = '700 110px Oswald, sans-serif'
  context.textAlign = 'center'
  context.fillText('KALOT', 540, 220)

  context.fillStyle = '#39ff14'
  context.shadowColor = '#39ff14'
  context.shadowBlur = 32
  context.fillText('MUNICIPALES', 540, 330)
  context.shadowBlur = 0

  context.fillStyle = '#ff6b35'
  context.font = '700 48px Oswald, sans-serif'
  context.fillText('TA CHANSON PREFEREE', 540, 470)

  context.fillStyle = '#ffffff'
  context.font = '700 92px Oswald, sans-serif'
  wrapCenteredText(context, input.championTitle.toUpperCase(), 540, 650, 820, 102)

  if (input.communeName) {
    context.fillStyle = '#00b4d8'
    context.font = '700 42px Oswald, sans-serif'
    context.fillText(input.communeName.toUpperCase(), 540, 840)
  }

  context.strokeStyle = 'rgba(255,107,53,0.55)'
  context.lineWidth = 4
  context.strokeRect(90, 930, 900, 520)

  context.fillStyle = '#ff6b35'
  context.font = '700 42px Oswald, sans-serif'
  context.fillText('TOP 3 SESSION', 540, 1015)

  input.top3.forEach((song, index) => {
    const y = 1120 + index * 120
    const rankColor = index === 0 ? '#39ff14' : index === 1 ? '#00b4d8' : '#ff6b35'
    context.fillStyle = rankColor
    context.font = '700 58px Oswald, sans-serif'
    context.fillText(String(index + 1), 180, y)

    context.fillStyle = '#ffffff'
    context.font = '700 52px Oswald, sans-serif'
    context.textAlign = 'left'
    context.fillText(song.title.toUpperCase(), 260, y)
    context.font = '500 26px Inter, sans-serif'
    context.fillStyle = '#d1d5db'
    context.fillText(`${song.points} points`, 260, y + 42)
    context.textAlign = 'center'
  })

  context.fillStyle = '#39ff14'
  context.font = '700 34px Oswald, sans-serif'
  context.fillText('KALOTMUNICIPALES', 540, 1710)
  context.fillStyle = '#ffffff'
  context.font = '500 24px Inter, sans-serif'
  context.fillText('Vote et partage ton podium sur kalotmunicipales.fr', 540, 1760)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png')
  })

  if (!blob) {
    throw new Error('Generation de l image impossible.')
  }

  return new File([blob], 'kalotmunicipales-story.png', { type: 'image/png' })
}

function wrapCenteredText(
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word
    if (context.measureText(nextLine).width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = nextLine
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  lines.forEach((line, index) => {
    context.fillText(line, centerX, startY + index * lineHeight)
  })
}
