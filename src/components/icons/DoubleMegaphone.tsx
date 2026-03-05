interface Props {
  className?: string
  animate?: boolean
}

export function DoubleMegaphone({
  className = 'w-8 h-8',
  animate = false,
}: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animate ? 'animate-megaphone-rock' : ''}`}
      aria-hidden="true"
    >
      <path
        d="M8 28L24 20V44L8 36V28Z"
        fill="hsl(var(--primary))"
        stroke="hsl(var(--foreground))"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect
        x="4"
        y="27"
        width="6"
        height="10"
        rx="2"
        fill="hsl(var(--secondary))"
        stroke="hsl(var(--foreground))"
        strokeWidth="1.5"
      />
      <ellipse
        cx="24"
        cy="32"
        rx="3"
        ry="12"
        fill="hsl(var(--primary))"
        stroke="hsl(var(--foreground))"
        strokeWidth="1.5"
      />

      <path
        d="M56 28L40 20V44L56 36V28Z"
        fill="hsl(var(--accent))"
        stroke="hsl(var(--foreground))"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect
        x="54"
        y="27"
        width="6"
        height="10"
        rx="2"
        fill="hsl(var(--secondary))"
        stroke="hsl(var(--foreground))"
        strokeWidth="1.5"
      />
      <ellipse
        cx="40"
        cy="32"
        rx="3"
        ry="12"
        fill="hsl(var(--accent))"
        stroke="hsl(var(--foreground))"
        strokeWidth="1.5"
      />

      <path
        d="M2 30C0 32 0 32 2 34"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M62 30C64 32 64 32 62 34"
        stroke="hsl(var(--accent))"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />

      <rect
        x="28"
        y="46"
        width="8"
        height="3"
        rx="1.5"
        fill="hsl(var(--foreground))"
        opacity="0.7"
      />
      <rect
        x="30"
        y="49"
        width="4"
        height="8"
        rx="2"
        fill="hsl(var(--muted-foreground))"
      />
    </svg>
  )
}
