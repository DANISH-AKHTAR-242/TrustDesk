import type { ReactNode } from 'react'
import { cx } from '../../lib/cx.ts'

/** Two-column definition list for metadata rows. */
export function KeyValue({ rows, className }: { rows: Array<[string, ReactNode]>; className?: string }) {
  return (
    <dl className={cx('grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm', className)}>
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-xs leading-5 whitespace-nowrap text-fg-muted">{k}</dt>
          <dd className="min-w-0 leading-5 break-words">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Monospace identifier (ticket, run, draft, doc ids), slightly smaller than body text. */
export function Mono({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <code title={title} className={cx('font-mono text-[12px] text-fg', className)}>
      {children}
    </code>
  )
}
