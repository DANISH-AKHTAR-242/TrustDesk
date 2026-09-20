import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cx } from '../../lib/cx.ts'

/** Monospace, scrollable block with a copy button. Non-string values are pretty-printed JSON. */
export function CodeBlock({ value, label, maxHeight = 260, wrap = false, className }: { value: unknown; label?: string; maxHeight?: number; wrap?: boolean; className?: string }) {
  const text = typeof value === 'string' ? value : value === undefined ? 'undefined' : JSON.stringify(value, null, 2)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])
  const copy = () => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => setCopied(true))
      .catch(() => setCopied(false))
  }
  return (
    <div className={cx('group relative rounded-lg border border-border bg-surface-2/60', className)}>
      {label ? <div className="border-b border-border px-3 py-1 font-mono text-[11px] text-fg-muted">{label}</div> : null}
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy'}
        className="absolute top-1 right-1 rounded-md border border-border bg-surface p-1 text-fg-muted opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 focus-visible:opacity-100 hover:text-fg"
      >
        {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
      </button>
      <pre style={{ maxHeight }} className={cx('overflow-auto p-3 font-mono text-xs leading-[18px] text-fg', wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre')}>
        {text}
      </pre>
    </div>
  )
}
