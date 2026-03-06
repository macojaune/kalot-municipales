import type { ButtonHTMLAttributes, ReactNode } from 'react'

type NeonButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  color?: 'green' | 'blue' | 'orange'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  active?: boolean
  children: ReactNode
}

function getColorClasses(color: 'green' | 'blue' | 'orange', active: boolean) {
  if (color === 'blue') {
    return {
      border: 'border-secondary',
      text: active ? 'text-background' : 'text-secondary',
      hover: 'hover:bg-secondary hover:text-background hover:box-glow-blue',
      activeBg: active ? 'bg-secondary box-glow-blue' : 'bg-transparent',
    }
  }

  if (color === 'orange') {
    return {
      border: 'border-accent',
      text: active ? 'text-background' : 'text-accent',
      hover: 'hover:bg-accent hover:text-background hover:box-glow-orange',
      activeBg: active ? 'bg-accent box-glow-orange' : 'bg-transparent',
    }
  }

  return {
    border: 'border-primary',
    text: active ? 'text-background' : 'text-primary',
    hover: 'hover:bg-primary hover:text-background hover:box-glow-green',
    activeBg: active ? 'bg-primary box-glow-green' : 'bg-transparent',
  }
}

function getSizeClasses(size: 'sm' | 'md' | 'lg') {
  if (size === 'lg') {
    return 'min-h-14 px-8 py-4 text-[1.55rem]'
  }

  if (size === 'sm') {
    return 'min-h-10 px-4 py-2 text-sm'
  }

  return 'min-h-12 px-6 py-3 text-base'
}

export function NeonButton({
  color = 'green',
  size = 'md',
  fullWidth = false,
  active = false,
  className = '',
  children,
  ...props
}: NeonButtonProps) {
  const colorClasses = getColorClasses(color, active)
  const sizeClasses = getSizeClasses(size)

  return (
    <button
      {...props}
      className={`relative z-10 overflow-hidden rounded-[4px] border-2 font-display font-bold tracking-[0.08em] transition-all duration-300 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed ${sizeClasses} ${fullWidth ? 'w-full' : ''} ${colorClasses.border} ${colorClasses.text} ${colorClasses.activeBg} ${colorClasses.hover} ${className}`}
    >
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  )
}
