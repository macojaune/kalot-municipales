import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number
}

export function MegaphoneTwinIcon({ size = 22, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 40"
      width={size}
      height={Math.round((size * 40) / 64)}
      aria-hidden="true"
      {...props}
    >
      <rect x="29" y="14" width="6" height="9" rx="2" fill="#5f5148" />
      <rect x="30" y="24" width="4" height="10" rx="2" fill="#9b8a74" />
      <path
        d="M7 11h7l15-7v22L14 19H7z"
        fill="#f8c51a"
        stroke="#2a201b"
        strokeWidth="2"
      />
      <path
        d="M57 11h-7L35 4v22l15-7h7z"
        fill="#f4673a"
        stroke="#2a201b"
        strokeWidth="2"
      />
      <rect x="3" y="13" width="4" height="6" rx="1" fill="#2a201b" />
      <rect x="57" y="13" width="4" height="6" rx="1" fill="#2a201b" />
      <rect x="15" y="11" width="4" height="10" rx="1" fill="#2358d4" />
      <rect x="45" y="11" width="4" height="10" rx="1" fill="#2358d4" />
      <path
        d="M1 14c1-2 2-2 3 0"
        fill="none"
        stroke="#f4673a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M63 14c-1-2-2-2-3 0"
        fill="none"
        stroke="#f4673a"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function VoteFistIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M5.4 10.8h2.5V7.6a1 1 0 0 1 2 0v3.2h1.4V7a1 1 0 0 1 2 0v3.8h1.4V7.4a1 1 0 0 1 2 0v4.2h.8a2.4 2.4 0 0 1 2.4 2.4v1.7c0 3.8-3.1 6.9-6.9 6.9h-3.9A4.8 4.8 0 0 1 4.3 18v-5.2a2 2 0 0 1 1.1-2z"
        fill="currentColor"
      />
    </svg>
  )
}

export function CrownBadgeIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M3.5 8.5l4.1 3.1L12 4.9l4.4 6.7 4.1-3.1-1.9 10.4h-13z"
        fill="#f8c51a"
        stroke="#2a201b"
        strokeWidth="1.4"
      />
      <circle cx="7.6" cy="8.4" r="1.2" fill="#2a201b" />
      <circle cx="12" cy="5.1" r="1.2" fill="#2a201b" />
      <circle cx="16.4" cy="8.4" r="1.2" fill="#2a201b" />
    </svg>
  )
}
