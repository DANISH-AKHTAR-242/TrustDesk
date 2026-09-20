import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Inbox, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useErrors } from '../components/ErrorBanner.tsx'
import { Page, PageHeader } from '../components/layout/Page.tsx'
import { Badge } from '../components/ui/Badge.tsx'
import { Card } from '../components/ui/Card.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { Input } from '../components/ui/Input.tsx'
import { Mono } from '../components/ui/KeyValue.tsx'
import { SkeletonRows } from '../components/ui/Skeleton.tsx'
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table.tsx'
import { Tabs } from '../components/ui/Tabs.tsx'
import { Tooltip } from '../components/ui/Tooltip.tsx'
import { api } from '../lib/api.ts'
import { fmt } from '../lib/format.ts'
import type { TicketListItem } from '../lib/types.ts'

type Loaded = { status: string; items: TicketListItem[] | null } // items null = the load failed

const COLS = 8

export default function TicketQueue() {
  const navigate = useNavigate()
  const { report } = useErrors()
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  // The list is tagged with the filter it was loaded for, so "loading" is derived, not set.
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  // Status values are whatever the API has returned so far (the pack only has "open"); never invented.
  const [knownStatuses, setKnownStatuses] = useState<string[]>(['open'])
  const current = loaded?.status === status ? loaded : null
  const tickets = current?.items ?? null
  const loading = current === null
  const failed = current !== null && current.items === null

  useEffect(() => {
    let cancelled = false
    api
      .listTickets(status || undefined)
      .then((page) => {
        if (cancelled) return
        setLoaded({ status, items: page.items })
        setKnownStatuses((known) => Array.from(new Set([...known, ...page.items.map((t) => t.status)])))
      })
      .catch((err) => {
        if (cancelled) return
        report(err, 'GET /api/tickets')
        setLoaded({ status, items: null })
      })
    return () => {
      cancelled = true
    }
  }, [status, report])

  // Client-side search over subject and ticket id (the API filter is status only).
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!tickets || !q) return tickets
    return tickets.filter((t) => t.subject.toLowerCase().includes(q) || t.ticket_id.toLowerCase().includes(q))
  }, [tickets, query])

  const open = (ticketId: string) => navigate(`/tickets/${ticketId}`)

  return (
    <Page>
      <PageHeader title="Ticket queue" description={loading ? 'loading…' : failed ? 'could not load tickets (see the error toast)' : `${shown?.length ?? 0} of ${tickets?.length ?? 0} tickets · Enter opens the focused row`} />
      <Card
        padded={false}
        header={
          <div className="flex w-full flex-wrap items-center gap-2">
            <Tabs label="Status" size="sm" value={status} onChange={setStatus} items={[{ value: '', label: 'All' }, ...knownStatuses.map((s) => ({ value: s, label: s }))]} />
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <Input size="sm" className="pl-7" placeholder="Search subject or ticket id" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search tickets" />
            </div>
          </div>
        }
      >
        <Table>
          <THead>
            <tr>
              <TH>Ticket</TH>
              <TH className="w-full">Subject</TH>
              <TH>Customer</TH>
              <TH>Category</TH>
              <TH>Priority</TH>
              <TH>Status</TH>
              <TH>Escalation</TH>
              <TH>Created</TH>
            </tr>
          </THead>
          <TBody>
            {loading ? <SkeletonRows cols={COLS} /> : null}
            {shown?.map((t) => (
              <TR key={t.ticket_id} onSelect={() => open(t.ticket_id)} aria-label={`${t.ticket_id} ${t.subject}`}>
                <TD>
                  <Mono>{t.ticket_id}</Mono>
                </TD>
                <TD className="max-w-[420px]">
                  <div className="truncate font-medium text-fg">{t.subject}</div>
                  <div className="text-xs text-fg-muted">{t.channel}</div>
                </TD>
                <TD className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    {t.customer.name}
                    <Badge size="sm" variant="neutral">
                      {t.customer.tier}
                    </Badge>
                  </span>
                </TD>
                <TD>{t.latest_triage ? <Badge variant="info">{t.latest_triage.category}</Badge> : <span className="text-xs text-fg-subtle">not triaged</span>}</TD>
                <TD>{t.latest_triage ? <Badge value={t.latest_triage.priority} /> : <span className="text-fg-subtle">—</span>}</TD>
                <TD>
                  <Badge value={t.status} />
                </TD>
                <TD>
                  {t.latest_triage ? (
                    t.latest_triage.should_escalate ? (
                      <Tooltip label="Escalate to a human">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                          <ArrowUpRight className="size-4" aria-hidden />
                          escalate
                        </span>
                      </Tooltip>
                    ) : (
                      <span className="text-xs text-fg-subtle">no</span>
                    )
                  ) : (
                    <span className="text-fg-subtle">—</span>
                  )}
                </TD>
                <TD className="whitespace-nowrap font-mono text-[12px] text-fg-muted">{fmt(t.created_at)}</TD>
              </TR>
            ))}
            {failed ? (
              <tr>
                <td colSpan={COLS} className="p-4">
                  <EmptyState tone="danger" title="Could not load tickets" description="The error toast has the code and request id." />
                </td>
              </tr>
            ) : null}
            {shown && shown.length === 0 ? (
              <tr>
                <td colSpan={COLS} className="p-4">
                  <EmptyState icon={<Inbox />} title={query ? 'No tickets match the search' : 'No tickets match this filter'} description={query ? `Nothing with "${query}" in the subject or id.` : 'Try another status.'} />
                </td>
              </tr>
            ) : null}
          </TBody>
        </Table>
      </Card>
    </Page>
  )
}
