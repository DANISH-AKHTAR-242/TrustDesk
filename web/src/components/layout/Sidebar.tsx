import { ChartBar, Crosshair, FileText, FlaskConical, Inbox, ShieldCheck, User } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cx } from '../../lib/cx.ts'
import { useSession } from '../../lib/session.tsx'
import { Tooltip } from '../ui/Tooltip.tsx'

// Route list (Phase 9 + Phase 11):
//   /                    TicketQueue
//   /tickets/:ticketId   TicketDetail
//   /documents           DocumentsPage
//   /evals               EvalsPage
//   /metrics             MetricsPage
//   /red-team            RedTeamPage
export const NAV: ReadonlyArray<{ to: string; label: string; icon: ReactNode; end?: boolean }> = [
  { to: '/', label: 'Tickets', icon: <Inbox />, end: false },
  { to: '/documents', label: 'Documents', icon: <FileText /> },
  { to: '/evals', label: 'Evaluations', icon: <FlaskConical /> },
  { to: '/metrics', label: 'Metrics', icon: <ChartBar /> },
  { to: '/red-team', label: 'Red team', icon: <Crosshair /> },
]

/** Fixed left rail: 224px with labels at ≥1280px, a 56px icon rail below that. */
export function Sidebar() {
  const session = useSession()
  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-14 flex-col border-r border-border bg-surface xl:w-56" aria-label="Primary">
      <NavLink to="/" className="flex h-12 shrink-0 items-center gap-2.5 border-b border-border px-4 text-fg no-underline hover:no-underline xl:px-4">
        <ShieldCheck className="size-5 shrink-0 text-accent" aria-hidden />
        <span className="hidden text-sm font-semibold tracking-tight xl:inline">TrustDesk</span>
      </NavLink>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV.map((item) => (
          <Tooltip key={item.to} label={item.label} side="right" className="w-full xl:[&::after]:hidden">
            <NavLink
              to={item.to}
              end={item.end ?? item.to !== '/'}
              className={({ isActive }) =>
                cx(
                  'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium no-underline transition-colors duration-150 ease-out hover:no-underline [&_svg]:size-4 [&_svg]:shrink-0',
                  isActive ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                )
              }
            >
              {item.icon}
              <span className="hidden truncate xl:inline">{item.label}</span>
            </NavLink>
          </Tooltip>
        ))}
      </nav>
      <div className="border-t border-border p-2">
        <Tooltip label={session.roleLabel} side="right" className="w-full xl:[&::after]:hidden">
          <div className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-xs text-fg-muted" title={session.token}>
            <User className="size-4 shrink-0" aria-hidden />
            <span className="hidden min-w-0 truncate xl:inline">{session.roleLabel}</span>
          </div>
        </Tooltip>
      </div>
    </aside>
  )
}
