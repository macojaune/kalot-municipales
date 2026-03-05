import { useRegion } from '../context/RegionContext'
import type { Region } from '../types/song'
import { REGION_LABELS } from '../types/song'

export function RegionSelector() {
  const { setRegion } = useRegion()

  const regions: Array<{ id: Region; color: string }> = [
    { id: 'guadeloupe', color: 'bg-primary' },
    { id: 'martinique', color: 'bg-secondary' },
    { id: 'guyane', color: 'bg-victory' },
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-grain">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-display font-black text-foreground">
            Choisis ta region
          </h1>
          <p className="text-muted-foreground font-body">
            Chaque territoire a ses propres sons de campagne
          </p>
        </div>

        <div className="space-y-3">
          {regions.map((region) => (
            <button
              key={region.id}
              type="button"
              onClick={() => setRegion(region.id)}
              className={`w-full py-5 px-6 rounded-xl border-2 border-border bg-card text-card-foreground font-display font-bold text-lg
                hover:border-primary hover:shadow-lg transition-all active:scale-[0.97]
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
