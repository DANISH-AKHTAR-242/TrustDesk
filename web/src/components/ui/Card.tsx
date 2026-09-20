import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx.ts'

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode
  /** Small text under the title. */
  description?: ReactNode
  /** Right-aligned header slot (buttons, badges). */
  action?: ReactNode
  /** Full custom header; replaces title/description/action. */
  header?: ReactNode
  /** Tints the card border (e.g. the adversarial section, a quarantined document). */
  tone?: 'default' | 'danger' | 'warning' | 'accent'
  padded?: boolean
}

const TONES = {
  default: 'border-border',
  danger: 'border-rose-500/40',
  warning: 'border-amber-500/40',
  accent: 'border-indigo-500/40',
} as const

export function Card({ title, description, action, header, tone = 'default', padded = true, className, children, ...rest }: CardProps) {
  const hasHeader = header !== undefined || title !== undefined || action !== undefined
  return (
    <section className={cx('rounded-lg border bg-surface', TONES[tone], className)} {...rest}>
      {hasHeader ? (
        <header className={cx('flex min-h-10 items-center justify-between gap-3 border-b border-border px-4 py-2')}>
          {header ?? (
            <div className="min-w-0">
              {title !== undefined ? <h3 className="truncate text-sm font-semibold text-fg">{title}</h3> : null}
              {description ? <p className="text-xs text-fg-muted">{description}</p> : null}
            </div>
          )}
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </header>
      ) : null}
      <div className={cx(padded && 'p-4', 'space-y-3')}>{children}</div>
    </section>
  )
}
