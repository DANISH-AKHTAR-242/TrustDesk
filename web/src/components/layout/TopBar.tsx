import { ChevronRight, Moon, Sun } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { TokenSelector } from '../../lib/session.tsx'
import { useTheme } from '../../lib/theme.ts'
import { Button } from '../ui/Button.tsx'
import { Tooltip } from '../ui/Tooltip.tsx'
import { NAV } from './Sidebar.tsx'

// Breadcrumb from the path: "/" → Tickets; "/tickets/tkt_9001" → Tickets › tkt_9001; "/evals" → Evaluations.
function crumbs(pathname: string): Array<{ label: string; to?: string; mono?: boolean }> {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return [{ label: 'Tickets' }]
  if (parts[0] === 'tickets') return [{ label: 'Tickets', to: '/' }, ...(parts[1] ? [{ label: parts[1], mono: true }] : [])]
  const nav = NAV.find((n) => n.to === `/${parts[0]}`)
  return nav ? [{ label: nav.label }] : [{ label: 'Not found' }]
}

export function TopBar() {
  const { pathname } = useLocation()
  const { theme, toggle } = useTheme()
  const trail = crumbs(pathname)
  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4">
      <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm sm:flex">
        {trail.map((c, i) => (
          <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
            {i > 0 ? <ChevronRight className="size-3.5 shrink-0 text-fg-subtle" aria-hidden /> : null}
            {c.to ? (
              <Link to={c.to} className="text-fg-muted no-underline hover:text-fg hover:no-underline">
                {c.label}
              </Link>
            ) : (
              <span className={c.mono ? 'truncate font-mono text-[12px] font-medium text-fg' : 'truncate font-medium text-fg'} aria-current="page">
                {c.label}
              </span>
            )}
          </span>
        ))}
      </nav>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <TokenSelector />
        <Tooltip side="left" label={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}>
          <Button variant="ghost" size="sm" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} icon={theme === 'dark' ? <Sun /> : <Moon />} />
        </Tooltip>
      </div>
    </header>
  )
}
