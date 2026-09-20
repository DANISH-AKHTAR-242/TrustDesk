import type { ReactNode } from 'react'
import { cx } from '../../lib/cx.ts'

export function EmptyState({ icon, title, description, action, tone = 'default', className }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; tone?: 'default' | 'danger'; className?: string }) {
  return (
    <div className={cx('flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-8 text-center', tone === 'danger' ? 'border-rose-500/40' : 'border-border', className)}>
      {icon ? <span className={cx('mb-1 [&_svg]:size-6', tone === 'danger' ? 'text-rose-500' : 'text-fg-subtle')}>{icon}</span> : null}
      <div className={cx('text-sm font-medium', tone === 'danger' ? 'text-rose-600 dark:text-rose-300' : 'text-fg')}>{title}</div>
      {description ? <div className="max-w-md text-xs text-fg-muted">{description}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
