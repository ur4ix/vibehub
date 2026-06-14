import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline'
}

export function PixelButton({
  variant = 'primary',
  className,
  children,
  ...props
}: PixelButtonProps) {
  return (
    <button
      className={cn(
        'font-pixel inline-flex items-center justify-center gap-2 border-2 px-5 py-3 text-[10px] uppercase leading-none tracking-wider transition-all duration-100 active:translate-x-1 active:translate-y-1 active:shadow-none',
        variant === 'primary' &&
          'border-primary bg-primary text-primary-foreground pixel-shadow-border hover:brightness-110',
        variant === 'outline' &&
          'border-border bg-transparent text-foreground pixel-shadow-border hover:border-primary hover:text-primary',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
