type SpeakerGrillPatternProps = {
  opacity?: number
  className?: string
}

export function SpeakerGrillPattern({
  opacity = 0.05,
  className = '',
}: SpeakerGrillPatternProps) {
  return (
    <div
      className={`speaker-grill ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    />
  )
}
