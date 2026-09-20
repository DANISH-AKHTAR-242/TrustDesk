// Tiny session context: the bearer token (persisted in localStorage) and the role label derived
// from it. The top bar's token selector writes the demo tokens; the override field takes any string,
// which is how the 403-on-approval demo is shown (agent token + Approve).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { KeyRound, LogIn, Settings } from 'lucide-react'
import { TOKEN_KEY, api, readToken, writeToken } from './api.ts'
import { useErrors } from '../components/ErrorBanner.tsx'
import { Badge } from '../components/ui/Badge.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Field, Input } from '../components/ui/Input.tsx'
import { Popover } from '../components/ui/Popover.tsx'
import { Tabs } from '../components/ui/Tabs.tsx'
import { Tooltip } from '../components/ui/Tooltip.tsx'

export type Role = 'support_agent' | 'support_manager' | 'admin'

export const DEMO_TOKENS: Record<Role, string> = {
  support_agent: import.meta.env.VITE_DEMO_AGENT_TOKEN ?? 'agent-token-123',
  support_manager: import.meta.env.VITE_DEMO_MANAGER_TOKEN ?? 'manager-token-123',
  admin: import.meta.env.VITE_DEMO_ADMIN_TOKEN ?? 'admin-token-123',
}

export const ROLE_LABELS: Record<Role, string> = {
  support_agent: 'Agent',
  support_manager: 'Manager',
  admin: 'Admin',
}

export interface Session {
  token: string
  /** Role implied by the token; null when the token is a free-text override that matches no demo token. */
  role: Role | null
  roleLabel: string
  /** False only when the token is KNOWN to be the agent token; an unknown token gets the buttons and the server decides. */
  canApprove: boolean
  isAdmin: boolean
  selectRole: (role: Role) => void
  setToken: (token: string) => void
}

const SessionContext = createContext<Session | null>(null)

const ROLES: Role[] = ['support_agent', 'support_manager', 'admin']

/** The role claim of a TrustDesk JWT (payload decoded, not verified — the server verifies), or null. */
export function roleFromJwt(token: string): { role: Role; name: string | null } | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const json = atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(json) as { role?: string; name?: string; iss?: string }
    if (payload.iss !== 'trustdesk' || !payload.role || !ROLES.includes(payload.role as Role)) return null
    return { role: payload.role as Role, name: payload.name ?? null }
  } catch {
    return null
  }
}

export function roleForToken(token: string): Role | null {
  for (const role of Object.keys(DEMO_TOKENS) as Role[]) if (DEMO_TOKENS[role] === token) return role
  return roleFromJwt(token)?.role ?? null
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string>(() => {
    // First visit: persist the default so the API wrapper and the header agree.
    const stored = readToken()
    if (!stored) writeToken(DEMO_TOKENS.support_agent)
    return stored || DEMO_TOKENS.support_agent
  })

  const setToken = useCallback((next: string) => {
    const trimmed = next.trim()
    writeToken(trimmed)
    setTokenState(trimmed)
  }, [])
  const selectRole = useCallback((role: Role) => setToken(DEMO_TOKENS[role]), [setToken])

  // Another tab changed the token: follow it, so the header label and the requests stay in step.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY && e.newValue !== null && e.newValue !== readToken()) setToken(e.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [setToken])

  const value = useMemo<Session>(() => {
    const role = roleForToken(token)
    return {
      token,
      role,
      roleLabel: role ? (roleFromJwt(token) ? `${roleFromJwt(token)?.name ?? ROLE_LABELS[role]} (${role}, logged in)` : `${ROLE_LABELS[role]} (${role})`) : token ? 'custom token' : 'no token',
      canApprove: role !== 'support_agent',
      isAdmin: role === 'admin',
      selectRole,
      setToken,
    }
  }, [token, selectRole, setToken])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): Session {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}

// The segmented control needs a value even when the token matches no demo role (override / JWT).
type RoleTab = Role | 'custom'

/**
 * Top-bar token selector: a segmented control for the three demo roles, and a settings popover with
 * the free-text override and the email/password login (Phase 11 item 4).
 */
export function TokenSelector() {
  const session = useSession()
  const { report } = useErrors()
  const [override, setOverride] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('agent@trustdesk.local')
  const [password, setPassword] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const closeSettings = useCallback(() => setSettingsOpen(false), [])
  const login = async () => {
    setLoggingIn(true)
    try {
      const res = await api.login(email, password)
      session.setToken(res.token)
      setPassword('')
      setShowLogin(false)
    } catch (err) {
      report(err, 'POST /api/auth/login')
    } finally {
      setLoggingIn(false)
    }
  }
  // A demo token or a JWT highlights its role; an override that matches nothing shows a "custom" segment.
  const tab: RoleTab = session.role ?? 'custom'
  const items = [
    ...(Object.keys(DEMO_TOKENS) as Role[]).map((role) => ({ value: role as RoleTab, label: ROLE_LABELS[role], title: DEMO_TOKENS[role] })),
    ...(tab === 'custom' ? [{ value: 'custom' as RoleTab, label: 'custom', title: session.token }] : []),
  ]
  return (
    <div className="flex items-center gap-2">
      <Tabs<RoleTab>
        size="sm"
        label="Role"
        items={items}
        value={tab}
        onChange={(v) => {
          if (v !== 'custom') session.selectRole(v)
        }}
      />
      <span className="hidden sm:inline-flex">
        <Badge variant={session.role === 'admin' ? 'accent' : session.role === 'support_manager' ? 'info' : session.role ? 'neutral' : 'warning'} title={session.token}>
          {session.roleLabel}
        </Badge>
      </span>
      <Popover
        open={settingsOpen}
        onClose={closeSettings}
        trigger={
          <Tooltip side="left" label="Token settings">
            <Button variant="ghost" size="sm" aria-label="Token settings" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((v) => !v)} icon={<Settings />} />
          </Tooltip>
        }
      >
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold">Token</div>
            <div className="text-xs text-fg-muted">
              Current: <span className="font-mono">{session.token.length > 40 ? `${session.token.slice(0, 40)}…` : session.token}</span>
            </div>
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (override.trim()) session.setToken(override)
              setOverride('')
            }}
          >
            <Field label="Override token" hint="any bearer string" className="flex-1">
              <Input size="sm" mono placeholder="override token…" value={override} onChange={(e) => setOverride(e.target.value)} aria-label="Override token" />
            </Field>
            <Button type="submit" size="sm" icon={<KeyRound />}>
              Use
            </Button>
          </form>
          <div className="border-t border-border pt-3">
            <Button size="sm" variant="ghost" icon={<LogIn />} onClick={() => setShowLogin((v) => !v)}>
              {showLogin ? 'Close login' : 'Log in'}
            </Button>
            {showLogin ? (
              <form
                className="mt-2 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  void login()
                }}
              >
                <Field label="Email">
                  <Input size="sm" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" placeholder="email" />
                </Field>
                <Field label="Password">
                  <Input size="sm" type="password" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" placeholder="password" />
                </Field>
                <Button type="submit" size="sm" variant="primary" loading={loggingIn} disabled={!password}>
                  Sign in
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      </Popover>
    </div>
  )
}
