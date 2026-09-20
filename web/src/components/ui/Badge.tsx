import type { ReactNode } from 'react'
import { cx } from '../../lib/cx.ts'

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent'
export type BadgeSize = 'sm' | 'md'

// Border-led, tinted backgrounds; text shades chosen so both themes pass AA on the tint.
const VARIANTS: Record<BadgeVariant, string> = {
  neutral: 'border-border bg-surface-2 text-fg-muted',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  danger: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  accent: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
}

const SIZES: Record<BadgeSize, string> = {
  sm: 'h-[18px] px-1.5 text-[11px]',
  md: 'h-5 px-2 text-xs',
}

// Variant per status / priority / outcome value; anything unknown renders neutral.
const VALUE_VARIANTS: Record<string, BadgeVariant> = {
  // ticket / draft / action / run statuses
  open: 'info',
  generated: 'info',
  edited: 'info',
  approved: 'success',
  sent: 'success',
  executed: 'success',
  completed: 'success',
  rejected: 'danger',
  failed: 'danger',
  approval_required: 'warning',
  requested: 'info',
  executing: 'warning',
  running: 'warning',
  cancelled: 'neutral',
  // priorities (urgent = rose, high = amber, medium = sky, low = neutral)
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
  // guardrail outcomes
  allow: 'success',
  allow_with_escalation: 'warning',
  refuse_and_escalate: 'danger',
  // trust levels
  trusted: 'success',
  untrusted: 'danger',
}

export const badgeVariantFor = (value: string): BadgeVariant => VALUE_VARIANTS[value] ?? 'neutral'

export function Badge({
  variant,
  size = 'md',
  value,
  title,
  className,
  children,
}: {
  /** Explicit variant; when omitted it is derived from `value`. */
  variant?: BadgeVariant
  size?: BadgeSize
  /** A status-like value: rendered as the text when there are no children, and used to pick the variant. */
  value?: string
  title?: string
  className?: string
  children?: ReactNode
}) {
  const v = variant ?? (value ? badgeVariantFor(value) : 'neutral')
  return (
    <span title={title} className={cx('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border font-medium leading-none', VARIANTS[v], SIZES[size], className)}>
      {children ?? value}
    </span>
  )
}
