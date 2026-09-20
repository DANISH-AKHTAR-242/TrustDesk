import { useEffect, useRef, type ReactNode } from 'react'
import { cx } from '../../lib/cx.ts'

/** Anchored panel below a trigger; closes on Escape and on clicks outside. The parent owns `open`. */
export function Popover({ open, onClose, trigger, align = 'end', width = 'w-80', className, children }: { open: boolean; onClose: () => void; trigger: ReactNode; align?: 'start' | 'end'; width?: string; className?: string; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onClick = (e: MouseEvent) => {
      if (root.current && e.target instanceof Node && !root.current.contains(e.target)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open, onClose])
  return (
    <div ref={root} className="relative">
      {trigger}
      {open ? (
        <div role="dialog" className={cx('absolute top-[calc(100%+6px)] z-[60] max-w-[calc(100vw-24px)] rounded-lg border border-border bg-surface p-3 shadow-lg', align === 'end' ? 'right-0' : 'left-0', width, className)}>
          {children}
        </div>
      ) : null}
    </div>
  )
}
