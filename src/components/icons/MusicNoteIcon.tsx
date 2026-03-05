export function MusicNoteIcon({
  className = 'w-5 h-5',
}: {
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M9 18V5L21 3V16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="6"
        cy="18"
        r="3"
        fill="hsl(var(--primary))"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx="18"
        cy="16"
        r="3"
        fill="hsl(var(--accent))"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}
