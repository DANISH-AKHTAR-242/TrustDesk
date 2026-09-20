import { cx } from '../../lib/cx.ts'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('skeleton h-4 w-full', className)} />
}

/** A few text-like lines of decreasing width. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  const widths = ['w-full', 'w-11/12', 'w-4/5', 'w-2/3', 'w-1/2']
  return (
    <div className={cx('space-y-2', className)} aria-busy="true" aria-label="loading">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cx('h-3.5', widths[i % widths.length])} />
      ))}
    </div>
  )
}

/** Placeholder table rows (same row height as the real ones). */
export function SkeletonRows({ rows = 6, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-hidden>
          {Array.from({ length: cols }, (_, c) => (
            <td key={c} className="h-9 border-b border-border px-3">
              <Skeleton className={cx('h-3.5', c === 0 ? 'w-20' : c === 1 ? 'w-full' : 'w-16')} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
