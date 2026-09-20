import { cx } from '../../lib/cx.ts'

const SIZES = { sm: 'size-3 border-[1.5px]', md: 'size-4 border-2' } as const

export function Spinner({ size = 'md', label, className }: { size?: keyof typeof SIZES; label?: string; className?: string }) {
  return (
    <span role="status" aria-live="polite" className={cx('inline-flex items-center gap-2', className)}>
      <span aria-hidden className={cx('spin inline-block shrink-0 rounded-full border-current border-r-transparent', SIZES[size])} />
      {label ? <span className="text-sm text-fg-muted">{label}</span> : <span className="sr-only">loading</span>}
    </span>
  )
}
