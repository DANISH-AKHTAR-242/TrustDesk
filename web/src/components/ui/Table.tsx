import type { HTMLAttributes, KeyboardEvent, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cx } from '../../lib/cx.ts'

/** Scroll container + table. Rows are 32–36px; the header is sticky inside the container. */
export function Table({ className, children, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cx('w-full border-collapse text-sm', className)} {...rest}>
        {children}
      </table>
    </div>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="sticky top-0 z-[1] bg-surface">{children}</thead>
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>
}

export function TH({ className, children, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th scope="col" className={cx('h-8 whitespace-nowrap border-b border-border px-3 text-left text-xs font-medium text-fg-muted', className)} {...rest}>
      {children}
    </th>
  )
}

export function TD({ className, children, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cx('h-9 border-b border-border px-3 py-1 align-middle', className)} {...rest}>
      {children}
    </td>
  )
}

export interface TRProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Makes the row hoverable, focusable and activatable with Enter / Space; ArrowUp / ArrowDown move between rows. */
  onSelect?: () => void
  selected?: boolean
  /** Rose left border for flagged rows (e.g. a quarantined document). */
  flagged?: boolean
}

export function TR({ onSelect, selected, flagged, className, children, onKeyDown, ...rest }: TRProps) {
  const interactive = onSelect !== undefined
  const handleKey = (e: KeyboardEvent<HTMLTableRowElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const rows = Array.from(e.currentTarget.parentElement?.querySelectorAll<HTMLTableRowElement>('tr[tabindex]') ?? [])
      const i = rows.indexOf(e.currentTarget)
      const next = rows[e.key === 'ArrowDown' ? i + 1 : i - 1]
      if (next) {
        e.preventDefault()
        next.focus()
      }
    } else if (interactive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onSelect()
    }
  }
  return (
    <tr
      tabIndex={interactive ? 0 : undefined}
      aria-selected={selected || undefined}
      onClick={onSelect}
      onKeyDown={interactive ? handleKey : onKeyDown}
      className={cx(
        'transition-colors duration-150 ease-out',
        interactive && 'cursor-pointer hover:bg-surface-2 focus:outline-none focus-visible:bg-surface-2 focus-visible:shadow-[inset_2px_0_0_var(--accent)]',
        selected && 'bg-accent-soft',
        flagged && 'shadow-[inset_3px_0_0_var(--color-rose-500)]',
        className,
      )}
      {...rest}
    >
      {children}
    </tr>
  )
}
