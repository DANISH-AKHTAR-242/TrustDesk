import type { ReactNode } from 'react'
import { cx } from '../../lib/cx.ts'

/** Standard page padding (16px gutter on phones, 24px from lg). */
export function Page({ children, className, wide = false }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={cx('mx-auto w-full space-y-4 px-4 py-4 lg:px-6', wide ? 'max-w-none' : 'max-w-[1400px]', className)}>{children}</div>
}

export function PageHeader({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
        {description ? <p className="mt-0.5 text-sm text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
