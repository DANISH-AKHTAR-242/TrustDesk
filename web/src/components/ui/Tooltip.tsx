import type { ReactNode } from 'react'
import { cx } from '../../lib/cx.ts'

/** CSS-only tooltip (styles.css `.tip`): shows `label` under (or beside) the wrapped element on hover / focus. */
export function Tooltip({ label, side = 'bottom', className, children }: { label: string; side?: 'bottom' | 'right' | 'left'; className?: string; children: ReactNode }) {
  return (
    <span className={cx('tip', className)} data-tip={label} data-tip-side={side}>
      {children}
    </span>
  )
}
