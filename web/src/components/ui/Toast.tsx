import { useEffect, type ReactNode } from 'react'
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { cx } from '../../lib/cx.ts'

export type ToastTone = 'info' | 'success' | 'warning' | 'danger'

export interface ToastData {
  id: number
  tone: ToastTone
  title: ReactNode
  message?: ReactNode
  /** Extra rows under the message (details JSON, request id). */
  extra?: ReactNode
}

const AUTO_DISMISS_MS = 5000

const TONES: Record<ToastTone, { box: string; icon: ReactNode }> = {
  info: { box: 'border-sky-500/40', icon: <Info className="size-4 text-sky-500" /> },
  success: { box: 'border-emerald-500/40', icon: <CircleCheck className="size-4 text-emerald-500" /> },
  warning: { box: 'border-amber-500/40', icon: <TriangleAlert className="size-4 text-amber-500" /> },
  danger: { box: 'border-rose-500/50', icon: <TriangleAlert className="size-4 text-rose-500" /> },
}

/** One toast: auto-dismisses after 5 s unless it is a danger toast (errors stay until closed). */
export function Toast({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: number) => void }) {
  const { id, tone } = toast
  useEffect(() => {
    if (tone === 'danger') return
    const t = setTimeout(() => onDismiss(id), AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [id, tone, onDismiss])
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('pointer-events-auto flex w-[380px] max-w-[calc(100vw-32px)] items-start gap-2.5 rounded-lg border bg-surface p-3 text-sm shadow-lg', TONES[tone].box)}>
      <span className="mt-0.5 shrink-0">{TONES[tone].icon}</span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="font-semibold leading-5 break-words">{toast.title}</div>
        {toast.message ? <div className="leading-5 break-words text-fg-muted">{toast.message}</div> : null}
        {toast.extra}
      </div>
      <button type="button" onClick={() => onDismiss(id)} aria-label="Dismiss" className="-m-1 shrink-0 rounded-md p-1 text-fg-muted transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-fg">
        <X className="size-4" />
      </button>
    </div>
  )
}

/** Fixed top-right stack, below the top bar so the role switcher stays reachable while an error is shown. */
export function ToastStack({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed top-14 right-3 z-50 flex max-h-[calc(100vh-68px)] flex-col items-end gap-2 overflow-y-auto">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
