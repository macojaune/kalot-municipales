import { useRegion } from '../context/RegionContext'
import type { Region } from '../types/song'
import { REGION_LABELS } from '../types/song'

export function RegionSelector({
  onSelect,
}: {
  onSelect?: (region: Region) => void
}) {
  const { setRegion } = useRegion()

  const regions: Array<{ id: Region; color: string }> = [
    { id: 'guadeloupe', color: 'bg-primary' },
    { id: 'martinique', color: 'bg-secondary' },
    { id: 'guyane', color: 'bg-victory' },
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-grain relative overflow-hidden">
      <div className="speaker-grill" />
      <div className="w-full max-w-sm space-y-8 animate-fade-in sm:max-w-md">
        <div className="text-center space-y-4">
          <div className="space-y-5">
            <div className="space-y-1.5 leading-none">
              <p className="font-display font-bold tracking-[-0.04em] text-foreground text-glow-white text-[clamp(4.4rem,20vw,7.6rem)]">
                KALOT
              </p>
              <p className="font-display font-bold tracking-[-0.05em] text-primary text-glow-green text-[clamp(2.9rem,13vw,6.5rem)] whitespace-nowrap">
                MUNICIPALES
              </p>
            </div>
            <p className="text-lg font-display font-black uppercase tracking-[-0.03em] text-primary text-glow-green sm:text-xl">
              Choisis ta region
            </p>
          </div>
          <p className="mx-auto max-w-xs text-muted-foreground font-body sm:max-w-sm">
            Chaque territoire a ses propres sons de campagne
          </p>
        </div>

        <div className="space-y-3">
          {regions.map((region) => (
            <button
              key={region.id}
              type="button"
              onClick={() => {
                setRegion(region.id)
                onSelect?.(region.id)
              }}
              className={`w-full py-5 px-6 rounded-xl border-2 border-border bg-card/80 text-card-foreground font-display font-bold text-lg neon-panel
                hover:border-primary hover:box-glow-green transition-all active:scale-[0.97]
                flex items-center gap-4`}
            >
              <span
                className={`w-4 h-4 rounded-full ${region.color} shrink-0`}
              />
              {REGION_LABELS[region.id]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
