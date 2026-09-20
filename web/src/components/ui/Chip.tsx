import type { ReactNode } from 'react'
import { cx } from '../../lib/cx.ts'

/** Small mono chip for doc ids, rule names and tags; with `onClick` it becomes a button (citation → document). */
export function Chip({ children, onClick, strong, title, className }: { children: ReactNode; onClick?: () => void; strong?: boolean; title?: string; className?: string }) {
  const base = cx(
    'inline-flex h-[22px] shrink-0 items-center gap-1 rounded-md border px-1.5 font-mono text-[11.5px] leading-none whitespace-nowrap',
    strong ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'border-border bg-surface-2 text-fg',
    onClick && 'cursor-pointer transition-colors duration-150 ease-out hover:border-accent hover:text-accent',
    className,
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} title={title} className={base}>
        {children}
      </button>
    )
  }
  return (
    <span title={title} className={base}>
      {children}
    </span>
  )
}
