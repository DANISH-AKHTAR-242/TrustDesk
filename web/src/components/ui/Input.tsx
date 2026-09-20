import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cx } from '../../lib/cx.ts'

const CONTROL =
  'w-full min-w-0 rounded-lg border border-border bg-surface px-2.5 text-sm text-fg placeholder:text-fg-subtle transition-colors duration-150 ease-out hover:border-border-strong focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md'
  mono?: boolean
}

export function Input({ className, size = 'md', mono, ...rest }: InputProps) {
  return <input className={cx(CONTROL, size === 'sm' ? 'h-7' : 'h-8', mono && 'font-mono text-[12px]', className)} {...rest} />
}

export function Textarea({ className, mono, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { mono?: boolean }) {
  return <textarea className={cx(CONTROL, 'py-2 leading-5', mono && 'font-mono text-[12px]', className)} {...rest} />
}

export function Select({ className, size = 'md', children, ...rest }: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & { size?: 'sm' | 'md' }) {
  return (
    <select className={cx(CONTROL, size === 'sm' ? 'h-7' : 'h-8', 'pr-7', className)} {...rest}>
      {children}
    </select>
  )
}

/** Label + hint wrapper for a control. */
export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block space-y-1', className)}>
      <span className="flex items-baseline gap-2 text-xs font-medium text-fg-muted">
        {label}
        {hint ? <span className="font-normal text-fg-subtle">{hint}</span> : null}
      </span>
      {children}
    </label>
  )
}
