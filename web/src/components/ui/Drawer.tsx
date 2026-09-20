import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cx } from '../../lib/cx.ts'
import { Button } from './Button.tsx'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Right slide-over: closes on Escape and backdrop click, keeps Tab focus inside, restores focus on close. */
export function Drawer({ open, title, description, onClose, width = 'md', children }: { open: boolean; title: ReactNode; description?: ReactNode; onClose: () => void; width?: 'md' | 'lg'; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel.current)?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  const trap = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !panel.current) return
    const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (items.length === 0) return
    const first = items[0]!
    const last = items[items.length - 1]!
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-zinc-950/50" onClick={onClose} role="presentation">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={trap}
        className={cx('flex h-full w-full flex-col border-l border-border bg-surface shadow-2xl outline-none', width === 'lg' ? 'max-w-3xl' : 'max-w-xl')}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{title}</h2>
            {description ? <div className="text-xs text-fg-muted">{description}</div> : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" icon={<X />} />
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
