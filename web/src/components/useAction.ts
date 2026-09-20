// useAction: run(name, fn) marks `name` busy while fn runs, reports any error as a toast, and never
// throws. Buttons use `busy === name` for their spinner and `busy !== null` to disable.
import { useCallback, useState } from 'react'
import { useErrors } from './ErrorBanner.tsx'

export function useAction() {
  const { report } = useErrors()
  const [busy, setBusy] = useState<string | null>(null)
  const run = useCallback(
    async (name: string, fn: () => Promise<void>, context?: string) => {
      setBusy(name)
      try {
        await fn()
      } catch (err) {
        report(err, context ?? name)
      } finally {
        setBusy(null)
      }
    },
    [report],
  )
  return { busy, run }
}
