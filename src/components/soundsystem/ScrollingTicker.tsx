import { useMemo } from 'react'
import { EqualizerBars } from './EqualizerBars'

type ScrollingTickerProps = {
  items: string[]
}

export function ScrollingTicker({ items }: ScrollingTickerProps) {
  const displayItems = useMemo(() => {
    if (!items.length) {
      return []
    }

    const seen = new Map<string, number>()
    const rows: Array<{ id: string; label: string }> = []

    for (let pass = 0; pass < 3; pass += 1) {
      for (const item of items) {
        const count = (seen.get(item) ?? 0) + 1
        seen.set(item, count)
        rows.push({ id: `${pass}-${item}-${count}`, label: item })
      }
    }

    return rows
  }, [items])

  if (!displayItems.length) {
    return null
  }

  return (
    <div className="relative w-full overflow-hidden border-y border-primary/30 bg-card/90 py-3">
      <div className="absolute bottom-0 left-0 top-0 z-10 w-14 bg-gradient-to-r from-card to-transparent" />
      <div className="absolute bottom-0 right-0 top-0 z-10 w-14 bg-gradient-to-l from-card to-transparent" />

      <div className="flex items-center whitespace-nowrap animate-[ticker_22s_linear_infinite]">
        {displayItems.map((item) => (
          <div key={item.id} className="mx-5 inline-flex items-center">
            <span className="mr-4 font-display text-[1.05rem] tracking-[0.08em] text-glow-green text-primary">
              {item.label}
            </span>
            <EqualizerBars barCount={3} color="green" variant="small" />
          </div>
        ))}
      </div>
    </div>
  )
}
