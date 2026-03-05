export function CrownIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M2 18L4 8L8 12L12 4L16 12L20 8L22 18H2Z"
        fill="hsl(var(--primary))"
        stroke="hsl(var(--foreground))"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="4" cy="8" r="1.5" fill="hsl(var(--primary))" />
      <circle cx="12" cy="4" r="1.5" fill="hsl(var(--primary))" />
      <circle cx="20" cy="8" r="1.5" fill="hsl(var(--primary))" />
    </svg>
  )
}
