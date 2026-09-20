// Every API error ends up here as a danger toast (top-right) with the code, HTTP status, message,
// request id and details. Pages call report(err); nothing is swallowed. Danger toasts never
// auto-dismiss, so a 403 stays on screen until the reviewer closes it.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { ApiError } from '../lib/api.ts'
import { ToastStack, type ToastData } from './ui/Toast.tsx'

export interface BannerError {
  id: number
  code: string
  message: string
  status: number | null
  requestId: string | null
  details: unknown
  context: string | null
}

interface ErrorContextValue {
  errors: BannerError[]
  report: (err: unknown, context?: string) => void
  dismiss: (id: number) => void
  clear: () => void
}

const ErrorContext = createContext<ErrorContextValue | null>(null)
let nextId = 1

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<BannerError[]>([])

  const report = useCallback((err: unknown, context?: string) => {
    const entry: BannerError =
      err instanceof ApiError
        ? { id: nextId++, code: err.code, message: err.message, status: err.status, requestId: err.requestId, details: err.details, context: context ?? null }
        : {
            id: nextId++,
            code: 'CLIENT_ERROR',
            message: err instanceof Error ? err.message : String(err),
            status: null,
            requestId: null,
            details: null,
            context: context ?? null,
          }
    setErrors((prev) => [...prev, entry])
  }, [])
  const dismiss = useCallback((id: number) => setErrors((prev) => prev.filter((e) => e.id !== id)), [])
  const clear = useCallback(() => setErrors([]), [])

  const value = useMemo(() => ({ errors, report, dismiss, clear }), [errors, report, dismiss, clear])
  return <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>
}

export function useErrors(): ErrorContextValue {
  const ctx = useContext(ErrorContext)
  if (!ctx) throw new Error('useErrors must be used inside ErrorProvider')
  return ctx
}

/** Renders the reported errors as danger toasts. */
export function ErrorBanners() {
  const { errors, dismiss } = useErrors()
  const toasts = useMemo<ToastData[]>(
    () =>
      errors.map((e) => ({
        id: e.id,
        tone: 'danger',
        title: (
          <>
            <span className="font-mono">{e.code}</span>
            {e.status ? <span className="font-normal text-fg-muted"> · HTTP {e.status}</span> : null}
          </>
        ),
        message: (
          <>
            {e.message}
            {e.context ? <span className="block text-xs text-fg-subtle">{e.context}</span> : null}
          </>
        ),
        extra:
          e.details != null || e.requestId ? (
            <div className="space-y-1">
              {e.details != null ? <pre className="max-h-32 overflow-auto rounded-md border border-border bg-surface-2/60 p-2 font-mono text-[11px] leading-4 whitespace-pre-wrap break-words">{JSON.stringify(e.details, null, 2)}</pre> : null}
              {e.requestId ? (
                <div className="font-mono text-[11px] text-fg-subtle">
                  request_id {e.requestId}
                </div>
              ) : null}
            </div>
          ) : undefined,
      })),
    [errors],
  )
  return <ToastStack toasts={toasts} onDismiss={dismiss} />
}
