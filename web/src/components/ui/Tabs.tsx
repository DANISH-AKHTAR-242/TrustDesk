import type { ReactNode } from 'react'
import { cx } from '../../lib/cx.ts'

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
  disabled?: boolean
  title?: string
}

/** Segmented control (role="tablist"): used for the status filter, the role switcher and in-card sections. */
export function Tabs<T extends string>({ items, value, onChange, size = 'md', label, className }: { items: ReadonlyArray<TabItem<T>>; value: T; onChange: (value: T) => void; size?: 'sm' | 'md'; label?: string; className?: string }) {
  return (
    <div role="tablist" aria-label={label} className={cx('inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5', className)}>
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            title={item.title}
            onClick={() => onChange(item.value)}
            className={cx(
              'rounded-md font-medium whitespace-nowrap transition-colors duration-150 ease-out disabled:opacity-50',
              size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-sm',
              active ? 'bg-surface text-fg shadow-[0_0_0_1px_var(--border)]' : 'text-fg-muted hover:text-fg',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
