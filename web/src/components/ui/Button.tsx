import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx.ts'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg border-transparent hover:brightness-110 shadow-none',
  secondary: 'bg-surface text-fg border-border hover:bg-surface-2 hover:border-border-strong',
  ghost: 'bg-transparent text-fg-muted border-transparent hover:bg-surface-2 hover:text-fg',
  danger: 'bg-rose-600 text-white border-transparent hover:bg-rose-500',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-sm gap-1.5 [&_svg]:size-3.5',
  md: 'h-8 px-3 text-sm gap-2 [&_svg]:size-4',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Shows a spinner in place of the icon and disables the button. */
  loading?: boolean
  icon?: ReactNode
}

export function Button({ variant = 'secondary', size = 'md', loading = false, icon, className, disabled, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-lg border font-medium transition-colors duration-150 ease-out',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <span aria-hidden className={cx('spin inline-block shrink-0 rounded-full border-current border-r-transparent', size === 'sm' ? 'size-3 border-[1.5px]' : 'size-3.5 border-2')} /> : icon}
      {children}
    </button>
  )
}
