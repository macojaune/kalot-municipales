import { useMemo } from 'react'

type EqualizerBarsProps = {
  barCount?: number
  color?: 'green' | 'blue' | 'orange'
  variant?: 'small' | 'large' | 'progress'
  progress?: number
  className?: string
}

type BarConfig = {
  id: number
  scale: number
  duration: number
  delay: number
}

function getColorClass(color: 'green' | 'blue' | 'orange') {
  if (color === 'blue') {
    return 'bg-secondary shadow-[0_0_10px_rgba(0,180,216,0.55)]'
  }

  if (color === 'orange') {
    return 'bg-accent shadow-[0_0_10px_rgba(255,107,53,0.55)]'
  }

  return 'bg-primary shadow-[0_0_10px_rgba(57,255,20,0.55)]'
}

function getDimensions(variant: 'small' | 'large' | 'progress') {
  if (variant === 'large') {
    return {
      widthClass: 'w-4.5 md:w-8',
      minHeight: 36,
      maxHeight: 132,
    }
  }

  if (variant === 'progress') {
    return {
      widthClass: 'w-1.5 md:w-2',
      minHeight: 8,
      maxHeight: 42,
    }
  }

  return {
    widthClass: 'w-1',
    minHeight: 6,
    maxHeight: 22,
  }
}

export function EqualizerBars({
  barCount = 5,
  color = 'green',
  variant = 'small',
  progress = 1,
  className = '',
}: EqualizerBarsProps) {
  const dimensions = getDimensions(variant)
  const colorClass = getColorClass(color)

  const bars = useMemo<BarConfig[]>(
    () =>
      Array.from({ length: barCount }, (_, index) => ({
        id: index,
        scale: 0.45 + Math.random() * 0.55,
        duration: 0.45 + Math.random() * 0.55,
        delay: Math.random() * 0.2,
      })),
    [barCount],
  )

  return (
    <div
      className={`flex items-end ${variant === 'large' ? 'gap-0.5 md:gap-1' : 'gap-1'
        } ${className}`}
    >
      {bars.map((bar, index) => {
        const isFilled = index / barCount < Math.max(0, Math.min(progress, 1))
        const height =
          dimensions.minHeight +
          (dimensions.maxHeight - dimensions.minHeight) * bar.scale

        return (
          <span
            key={bar.id}
            className={`${dimensions.widthClass} origin-bottom  ${variant === 'progress' && !isFilled ? 'bg-muted' : colorClass
              }`}
            style={{
              height,
              animation:
                variant === 'progress' && !isFilled
                  ? undefined
                  : `equalizer ${bar.duration}s ease-in-out ${bar.delay}s infinite`,
            }}
            aria-hidden="true"
          />
        )
      })}
    </div>
  )
}
