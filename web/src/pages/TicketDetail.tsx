import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowRight, Bot, CalendarClock, MessageSquareWarning, Play, ShieldAlert, ShieldCheck, ShieldX, ThumbsDown, ThumbsUp, Wand2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ActionButton } from '../components/ActionButton.tsx'
import { DocumentDrawer } from '../components/DocumentDrawer.tsx'
import { useErrors } from '../components/ErrorBanner.tsx'
import { Page } from '../components/layout/Page.tsx'
import { Badge } from '../components/ui/Badge.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { Chip } from '../components/ui/Chip.tsx'
import { CodeBlock } from '../components/ui/CodeBlock.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { Field, Input, Select, Textarea } from '../components/ui/Input.tsx'
import { KeyValue, Mono } from '../components/ui/KeyValue.tsx'
import { Skeleton, SkeletonText } from '../components/ui/Skeleton.tsx'
import { Tooltip } from '../components/ui/Tooltip.tsx'
import { useAction } from '../components/useAction.ts'
import { RUNS_LIMIT, api } from '../lib/api.ts'
import { cx } from '../lib/cx.ts'
import { fmt } from '../lib/format.ts'
import { useSession } from '../lib/session.tsx'
import type { AgentRun, Draft, Feedback, FiredRule, TicketDetail as TicketDetailDto, ToolActionDetail, ToolCatalogItem } from '../lib/types.ts'

// Draft lifecycle (server D-045/D-048): which statuses each transition accepts.
const DRAFT_FROM: Record<'edited' | 'approved' | 'rejected' | 'sent', readonly string[]> = {
  edited: ['generated', 'edited', 'approved'],
  approved: ['generated', 'edited'],
  rejected: ['generated', 'edited', 'approved'],
  sent: ['approved'],
}

// Keyed by ticket id so navigating between tickets starts from clean state.
export default function TicketDetailRoute() {
  const { ticketId = '' } = useParams()
  return <TicketDetail key={ticketId} ticketId={ticketId} />
}

function TicketDetail({ ticketId }: { ticketId: string }) {
  const { report } = useErrors()
  const session = useSession()
  const { busy, run } = useAction()

  const [detail, setDetail] = useState<TicketDetailDto | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  // The latest triage run, fetched by id when it is older than the newest RUNS_LIMIT runs (fired-rule chips).
  const [triageRunExtra, setTriageRunExtra] = useState<AgentRun | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [actions, setActions] = useState<ToolActionDetail[]>([])
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [catalog, setCatalog] = useState<ToolCatalogItem[]>([])
  const [docId, setDocId] = useState<string | null>(null)
  const closeDoc = useCallback(() => setDocId(null), [])

  // No optimistic updates: every mutation re-fetches everything the page shows.
  const reload = useCallback(async () => {
    const [d, dr, ac, ru, fb] = await Promise.all([api.getTicket(ticketId), api.listDrafts(ticketId), api.listActions(ticketId), api.listRuns(ticketId), api.listFeedback(ticketId)])
    // eval_case runs belong to the Evals page: they carry evaluation-only data (rule R2), not operations.
    const operational = ru.items.filter((r) => r.run_type !== 'eval_case')
    const triageId = d.latest_triage?.run_id ?? null
    const extra = triageId && !operational.some((r) => r.run_id === triageId) ? await api.getRun(triageId) : null
    setDetail(d)
    setDrafts(dr.items)
    setActions(ac.items)
    setRuns(operational)
    setFeedback(fb.items)
    setTriageRunExtra(extra)
    setLoadFailed(false)
  }, [ticketId])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        await reload()
      } catch (err) {
        if (cancelled) return
        report(err, `load ticket ${ticketId}`)
        setLoadFailed(true)
      }
    }
    void load()
    api
      .toolCatalog()
      .then((r) => {
        if (!cancelled) setCatalog(r.items)
      })
      .catch((err) => {
        if (!cancelled) report(err, 'GET /api/tool-actions/catalog')
      })
    return () => {
      cancelled = true
    }
  }, [reload, report, ticketId])

  const triage = detail?.latest_triage ?? null
  const triageRun = useMemo(() => runs.find((r) => r.run_id === triage?.run_id) ?? triageRunExtra ?? null, [runs, triage, triageRunExtra])
  const firedRules = ((triageRun?.guardrail_results as { fired_rules?: FiredRule[] } | null)?.fired_rules ?? []) as FiredRule[]
  const draft = drafts[0] ?? null

  // ---- draft editing state -------------------------------------------------------------------
  // The local edit is tagged with the draft it belongs to and the server body it started from, so a
  // new draft or a saved edit shows the server text without an effect.
  const [edit, setEdit] = useState<{ draftId: string; base: string; body: string } | null>(null)
  const body = edit && draft && edit.draftId === draft.draft_id && edit.base === draft.body ? edit.body : (draft?.body ?? '')
  const setBody = (next: string) => draft && setEdit({ draftId: draft.draft_id, base: draft.body, body: next })
  // An unsaved edit must be saved (or discarded) before Approve / Reject / Send, so what is on screen
  // is always the text the server acts on.
  const dirty = draft !== null && body !== draft.body
  const [rejectReason, setRejectReason] = useState('Rejected by the reviewer in the TrustDesk UI')
  // Feedback (Phase 11 item 2): thumbs map to rating 5 / 1; an unsaved edit of the body is sent as the corrected response.
  const [feedbackComment, setFeedbackComment] = useState('')

  // ---- request-action form state -------------------------------------------------------------
  // Defaults are derived from the catalog and the ticket; the form state only holds user edits.
  const [form, setForm] = useState<{ tool: string; fields: Record<string, string>; idemKey: string } | null>(null)
  const [lastRequest, setLastRequest] = useState<{ created: boolean; action: ToolActionDetail } | null>(null)
  const [decisionReason, setDecisionReason] = useState('Reviewed in the TrustDesk UI')
  const tool = form?.tool ?? catalog[0]?.tool_name ?? ''
  const toolDef = catalog.find((c) => c.tool_name === tool) ?? null
  const fields = form && form.tool === tool ? form.fields : toolDef && detail ? defaultFields(toolDef, detail) : {}
  const idemKey = form && form.tool === tool ? form.idemKey : `${ticketId}-${tool}-1`
  const setField = (k: string, v: string) => setForm({ tool, fields: { ...fields, [k]: v }, idemKey })
  const setIdemKey = (v: string) => setForm({ tool, fields, idemKey: v })
  const prefill = (toolName: string, reason?: string) => {
    const def = catalog.find((c) => c.tool_name === toolName)
    if (!def || !detail) return
    setForm({ tool: toolName, fields: defaultFields(def, detail, reason), idemKey: `${ticketId}-${toolName}-1` })
  }

  // ---- trace panel ---------------------------------------------------------------------------
  // A manual pick is tagged with the newest run at the time; a new run (triage, draft, action) resets it.
  const [pick, setPick] = useState<{ newest: string; runId: string } | null>(null)
  const newestRun = runs[0] ?? null
  const shownRun = (pick && newestRun && pick.newest === newestRun.run_id ? runs.find((r) => r.run_id === pick.runId) : undefined) ?? newestRun

  if (!detail) {
    return (
      <Page>
        <div className="text-sm">
          <Link to="/" className="text-fg-muted">
            ← queue
          </Link>
        </div>
        {loadFailed ? (
          <EmptyState tone="danger" title={<span>Could not load ticket <Mono>{ticketId}</Mono></span>} description="The error toast has the code and request id." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[320px_1fr] wide:grid-cols-[320px_1fr_380px]">
            {[0, 1, 2].map((i) => (
              <Card key={i} title={<Skeleton className="h-3.5 w-24" />}>
                <SkeletonText lines={6} />
              </Card>
            ))}
          </div>
        )}
      </Page>
    )
  }

  const pc = detail.policy_context
  const canApprove = session.canApprove

  const doTriage = () => run('triage', async () => {
    await api.runTriage(ticketId)
    await reload()
  }, 'POST triage')
  const doDraft = () => run('draft', async () => {
    await api.generateDraft(ticketId)
    await reload()
  }, 'POST draft-reply')
  const patchDraft = (name: string, body_: Parameters<typeof api.patchDraft>[1]) =>
    run(name, async () => {
      if (!draft) return
      await api.patchDraft(draft.draft_id, body_)
      await reload()
    }, `PATCH /api/drafts (${body_.status})`)
  const requestAction = () =>
    run('request', async () => {
      if (!toolDef) return
      const payload: Record<string, unknown> = { idempotency_key: idemKey }
      for (const [k, v] of Object.entries(fields)) payload[k] = k === 'amount' ? Number(v) : v
      const result = await api.requestAction({ ticket_id: ticketId, tool_name: toolDef.tool_name, payload })
      setLastRequest(result)
      await reload()
    }, 'POST /api/tool-actions')
  const decide = (action: ToolActionDetail, decision: 'approved' | 'rejected') =>
    run(`${decision}-${action.action_id}`, async () => {
      await api.decideAction(action.action_id, decision, decisionReason)
      await reload()
    }, `POST /api/tool-actions/${action.action_id}/approve as ${session.roleLabel}`)
  const leaveFeedback = (rating: 1 | 5) =>
    run(`feedback-${rating}`, async () => {
      if (!draft) return
      await api.createFeedback({
        ticket_id: ticketId,
        draft_id: draft.draft_id,
        rating,
        reason: feedbackComment.trim() || undefined,
        corrected_response: dirty ? body : undefined,
      })
      setFeedbackComment('')
      await reload()
    }, 'POST /api/feedback')
  const execute = (action: ToolActionDetail) =>
    run(`execute-${action.action_id}`, async () => {
      await api.executeAction(action.action_id)
      await reload()
    }, `POST /api/tool-actions/${action.action_id}/execute`)

  const triaging = busy === 'triage'
  const drafting = busy === 'draft'

  return (
    <div className="flex flex-col wide:h-full">
      {/* Ticket header: sticky at the top of the scroll area (fixed above the panes at ≥1440). */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-bg/95 px-4 py-2.5 backdrop-blur-sm lg:px-6">
        <Mono className="text-[13px] font-semibold">{detail.ticket_id}</Mono>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-fg">{detail.subject}</h1>
        <div className="flex items-center gap-2 text-xs text-fg-muted">
          <Badge value={detail.status} />
          <span>{detail.channel}</span>
          <span>·</span>
          <span className="font-mono">{fmt(detail.created_at)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[320px_1fr] lg:px-6 wide:min-h-0 wide:flex-1 wide:grid-cols-[320px_1fr_380px] wide:grid-rows-[minmax(0,1fr)] wide:overflow-hidden">
        {/* ------------------------------------------------ LEFT: context */}
        <Pane title="Context" className="lg:sticky lg:top-14 lg:row-span-2 lg:max-h-[calc(100dvh-7.5rem)] lg:self-start lg:overflow-y-auto wide:static wide:row-span-1 wide:max-h-none wide:h-full">
          <Card title="Customer">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium">{detail.customer.name}</span>
              <Badge variant="neutral">{detail.customer.tier}</Badge>
              <Badge variant={detail.customer.verified ? 'success' : 'warning'}>{detail.customer.verified ? 'verified' : 'not verified'}</Badge>
            </div>
            <KeyValue
              rows={[
                ['id', <Mono key="id">{detail.customer.customer_id}</Mono>],
                ['email', detail.customer.email],
                ['country', detail.customer.country],
                [
                  'tags',
                  detail.customer.tags.length ? (
                    <span key="tags" className="flex flex-wrap gap-1">
                      {detail.customer.tags.map((t) => (
                        <Chip key={t}>{t}</Chip>
                      ))}
                    </span>
                  ) : (
                    '—'
                  ),
                ],
              ]}
            />
          </Card>

          <Card title="Order">
            {detail.order ? (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Mono>{detail.order.order_id}</Mono>
                  <Badge variant="info">{detail.order.status}</Badge>
                  <Badge variant="neutral">{detail.order.payment_status}</Badge>
                </div>
                <KeyValue
                  rows={[
                    ['placed', fmt(detail.order.placed_at)],
                    ['delivered', fmt(detail.order.delivered_at)],
                    ['return until', fmt(detail.order.eligible_return_until)],
                    ['tracking', <Mono key="trk">{detail.order.tracking_number}</Mono>],
                    ['total', `${detail.order.total} ${detail.order.currency}`],
                  ]}
                />
                <ul className="space-y-1 text-sm">
                  {detail.order.items.map((it, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-1.5">
                      <Mono>{it.sku}</Mono>
                      <span>
                        {it.name} × {it.quantity}
                      </span>
                      <span className="text-xs text-fg-muted">{it.category}</span>
                      {it.final_sale ? <Badge size="sm" variant="warning">final sale</Badge> : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-fg-muted">No linked order.</p>
            )}
          </Card>

          <Card title="Policy context">
            <p className="flex items-start gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-800 dark:text-indigo-200">
              <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Evaluated as of <strong className="font-mono">{pc.as_of}</strong> — the ticket's <code>created_at</code>, never today's date.
              </span>
            </p>
            <SectionLabel>Return window</SectionLabel>
            {pc.return_window ? (
              <KeyValue
                rows={[
                  ['eligible', <Badge key="eligible" variant={pc.return_window.eligible ? 'success' : 'danger'}>{pc.return_window.eligible ? 'eligible' : 'not eligible'}</Badge>],
                  ['reason', pc.return_window.reason],
                  ['window ends', fmt(pc.return_window.window_ends_at)],
                ]}
              />
            ) : (
              <p className="text-xs text-fg-muted">n/a (no order)</p>
            )}
            <SectionLabel>Warranty</SectionLabel>
            {pc.warranty ? (
              <KeyValue
                rows={[
                  ['covered', <Badge key="covered" variant={pc.warranty.covered ? 'success' : 'danger'}>{pc.warranty.covered ? 'covered' : 'not covered'}</Badge>],
                  ['months since delivery', pc.warranty.months_since_delivery === null ? 'n/a' : String(pc.warranty.months_since_delivery)],
                  ['window', `${pc.warranty.window_months} months${pc.warranty.extension_applied ? ' (gold extension applied)' : ''}`],
                  ['reason', pc.warranty.reason],
                ]}
              />
            ) : (
              <p className="text-xs text-fg-muted">n/a (no order)</p>
            )}
          </Card>
        </Pane>

        {/* ------------------------------------------------ CENTRE: conversation and AI */}
        <Pane title="Conversation & AI" className="min-w-0 wide:h-full wide:overflow-y-auto">
          <Card
            title="Customer message"
            action={
              <Badge variant="warning" title="Customer text is untrusted data, never instructions (rule R3)">
                <MessageSquareWarning className="size-3" aria-hidden />
                untrusted
              </Badge>
            }
          >
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="text-xs text-fg-muted">
                {detail.customer.name} via {detail.channel} · <span className="font-mono">{fmt(detail.created_at)}</span>
              </div>
              <div className="mt-1 font-medium">{detail.subject}</div>
              <pre className="mt-2 font-sans text-sm leading-5 whitespace-pre-wrap break-words text-fg">{detail.body}</pre>
            </div>
          </Card>

          <Card
            title="Triage"
            action={
              <ActionButton name="triage" busy={busy} onClick={doTriage} variant="primary" size="sm" icon={<Wand2 />}>
                Run Triage
              </ActionButton>
            }
          >
            {triaging ? (
              <div className="space-y-3" aria-busy="true">
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-14" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <SkeletonText lines={2} />
              </div>
            ) : triage ? (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="info">{triage.category}</Badge>
                  <Badge value={triage.priority} />
                  <Badge variant="neutral">{triage.sentiment}</Badge>
                  <Badge variant={triage.should_escalate ? 'danger' : 'success'}>{triage.should_escalate ? 'escalate' : 'no escalation'}</Badge>
                </div>
                <p className="text-sm">{triage.reason_summary}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-fg-muted">deterministic rules:</span>
                  {firedRules.length === 0 ? <span className="text-xs text-fg-muted">none fired</span> : null}
                  {firedRules.map((r) => (
                    <Chip key={r.rule} strong={r.applied} title={`matched: ${r.matched_terms.join(', ')}${r.applied ? '' : ' (recorded, not applied)'}`}>
                      {r.rule}
                      {r.applied ? '' : ' (not applied)'}
                    </Chip>
                  ))}
                </div>
                <div className="text-xs text-fg-muted">
                  run <Mono>{triage.run_id}</Mono> · <span className="font-mono">{fmt(triage.created_at)}</span>
                </div>
              </>
            ) : (
              <EmptyState icon={<Bot />} title="Not triaged yet" description="Run Triage classifies category, priority, sentiment and escalation; the deterministic post-rules are shown as chips." />
            )}
          </Card>

          <Card
            title="Draft reply"
            action={
              <ActionButton name="draft" busy={busy} onClick={doDraft} variant="primary" size="sm" icon={<Wand2 />}>
                Generate Draft
              </ActionButton>
            }
          >
            {drafting ? (
              <div className="space-y-3" aria-busy="true">
                <Skeleton className="h-9 w-full" />
                <SkeletonText lines={5} />
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-5 w-28" />
                </div>
              </div>
            ) : draft ? (
              <>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
                  <Badge value={draft.status} />
                  {draft.confidence ? <span>confidence {draft.confidence}</span> : null}
                  <span>
                    <Mono>{draft.draft_id}</Mono> · {drafts.length} draft{drafts.length === 1 ? '' : 's'} for this ticket
                  </span>
                </div>
                {draft.guardrail_outcome ? <GuardrailBanner outcome={draft.guardrail_outcome} refusalReason={draft.refusal_reason} /> : null}
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9} disabled={!DRAFT_FROM.edited.includes(draft.status)} aria-label="Draft body" />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-fg-muted">citations:</span>
                  {draft.citations.length === 0 ? <span className="text-xs text-fg-muted">none</span> : null}
                  {draft.citations.map((c) => (
                    <Chip key={c} onClick={() => setDocId(c)} title="open the document">
                      {c}
                    </Chip>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-fg-muted">recommended actions (AI recommends only; a human requests, approves and executes):</div>
                  {draft.recommended_actions.length === 0 ? <div className="text-xs text-fg-muted">none</div> : null}
                  <ul className="space-y-1.5">
                    {draft.recommended_actions.map((a) => (
                      <li key={a.tool_name} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-2.5 py-1.5">
                        <Mono>{a.tool_name}</Mono>
                        {a.requires_human_approval ? <Badge variant="warning">approval required</Badge> : <Badge variant="neutral">low risk</Badge>}
                        <span className="min-w-0 flex-1 text-xs text-fg-muted">{a.reason}</span>
                        <Button size="sm" onClick={() => prefill(a.tool_name, a.reason)} icon={<ArrowRight />}>
                          Request
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <ActionButton name="edit" busy={busy} size="sm" onClick={() => patchDraft('edit', { status: 'edited', body })} disabled={!DRAFT_FROM.edited.includes(draft.status)}>
                    Save Edit
                  </ActionButton>
                  {dirty ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setEdit(null)} disabled={busy !== null}>
                        Discard
                      </Button>
                      <span className="text-xs text-rose-600 dark:text-rose-300">unsaved edit — Save Edit or Discard before approving, rejecting or sending</span>
                    </>
                  ) : null}
                  <ActionButton name="approve-draft" busy={busy} size="sm" onClick={() => patchDraft('approve-draft', { status: 'approved' })} disabled={dirty || !DRAFT_FROM.approved.includes(draft.status)}>
                    Approve
                  </ActionButton>
                  <ActionButton name="reject-draft" busy={busy} size="sm" variant="danger" onClick={() => patchDraft('reject-draft', { status: 'rejected', reason: rejectReason })} disabled={dirty || !DRAFT_FROM.rejected.includes(draft.status)}>
                    Reject
                  </ActionButton>
                  <Input size="sm" className="w-56" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} aria-label="Reject reason" placeholder="reject reason" />
                  <ActionButton name="send" busy={busy} size="sm" variant="primary" onClick={() => patchDraft('send', { status: 'sent' })} disabled={dirty || !DRAFT_FROM.sent.includes(draft.status)}>
                    Send
                  </ActionButton>
                </div>
                <div className="space-y-2 rounded-lg border border-border bg-surface-2/40 p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-fg-muted">Was this draft useful?</span>
                    <Tooltip label="thumbs up: rating 5">
                      <ActionButton name="feedback-5" busy={busy} size="sm" onClick={() => leaveFeedback(5)} aria-label="Thumbs up" icon={<ThumbsUp />}>
                        Thumbs up
                      </ActionButton>
                    </Tooltip>
                    <Tooltip label="thumbs down: rating 1">
                      <ActionButton name="feedback-1" busy={busy} size="sm" onClick={() => leaveFeedback(1)} aria-label="Thumbs down" icon={<ThumbsDown />}>
                        Thumbs down
                      </ActionButton>
                    </Tooltip>
                    <Input size="sm" className="w-56" value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} placeholder="comment (optional)" aria-label="Feedback comment" />
                    {dirty ? <span className="text-xs text-fg-muted">your unsaved edit is sent as the corrected response</span> : null}
                  </div>
                  {feedback.length > 0 ? (
                    <ul className="space-y-1 text-xs">
                      {feedback.slice(0, 3).map((f) => (
                        <li key={f.feedback_id} className="flex flex-wrap items-center gap-1.5">
                          <Badge size="sm" variant={f.rating >= 4 ? 'success' : f.rating <= 2 ? 'danger' : 'warning'}>
                            {f.rating >= 4 ? 'good' : f.rating <= 2 ? 'poor' : 'mixed'}
                          </Badge>
                          <span>{f.rating}/5</span>
                          {f.draft_id ? (
                            <span className="text-fg-muted">
                              on <Mono>{f.draft_id}</Mono>
                            </span>
                          ) : null}
                          {f.reason ? <span>— {f.reason}</span> : null}
                          {f.corrected_response ? <span className="text-fg-muted">(with a corrected response)</span> : null}
                          <span className="font-mono text-fg-subtle">{fmt(f.created_at)}</span>
                        </li>
                      ))}
                      {feedback.length > 3 ? <li className="text-fg-muted">{feedback.length - 3} more…</li> : null}
                    </ul>
                  ) : null}
                </div>
              </>
            ) : (
              <EmptyState icon={<Bot />} title="No draft yet" description="Generate Draft grounds a reply in the knowledge base; triage runs automatically if needed." />
            )}
          </Card>
        </Pane>

        {/* ------------------------------------------------ RIGHT: actions and trace */}
        <Pane title="Actions & trace" className="min-w-0 lg:col-start-2 wide:col-start-3 wide:row-start-1 wide:h-full wide:overflow-y-auto">
          <Card title="Request action">
            <Field label="tool">
              <Select value={tool} onChange={(e) => prefill(e.target.value)}>
                {catalog.map((c) => (
                  <option key={c.tool_name} value={c.tool_name}>
                    {c.tool_name} ({c.risk_level}
                    {c.requires_human_approval ? ', approval required' : ''})
                  </option>
                ))}
              </Select>
            </Field>
            {toolDef ? (
              <p className="text-xs text-fg-muted">
                {toolDef.description} Allowed categories: {toolDef.allowed_categories.join(', ')}.
              </p>
            ) : null}
            {Object.keys(fields).map((k) => (
              <Field key={k} label={k}>
                <Input mono value={fields[k] ?? ''} onChange={(e) => setField(k, e.target.value)} type={k === 'amount' ? 'number' : 'text'} />
              </Field>
            ))}
            <Field label="idempotency_key" hint="re-submit the same key to demo a replay">
              <Input mono value={idemKey} onChange={(e) => setIdemKey(e.target.value)} />
            </Field>
            <ActionButton name="request" busy={busy} onClick={requestAction} variant="primary" disabled={!toolDef}>
              Request {toolDef?.tool_name ?? 'action'}
            </ActionButton>
            {lastRequest ? (
              <div className={cx('rounded-lg border px-3 py-2 text-sm', lastRequest.created ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200' : 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200')}>
                {lastRequest.created ? (
                  <>
                    <strong>201 created</strong> <Mono>{lastRequest.action.action_id}</Mono> — status <Badge value={lastRequest.action.status} />
                  </>
                ) : (
                  <>
                    <strong>200 idempotent replay</strong> — existing action <Mono>{lastRequest.action.action_id}</Mono> returned, no second action created (idempotent_replay = {String(lastRequest.action.idempotent_replay)})
                  </>
                )}
              </div>
            ) : null}
          </Card>

          <Card title="Actions" action={<span className="text-xs text-fg-muted">{actions.length} for this ticket</span>}>
            {actions.length > 0 ? (
              <Field label="decision reason">
                <Input size="sm" value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} aria-label="Decision reason" />
              </Field>
            ) : null}
            {actions.length === 0 ? <EmptyState title="No actions requested yet" description="Request one above, or use a recommendation from the draft." /> : null}
            {actions.map((a) => (
              <div key={a.action_id} className="space-y-2 rounded-lg border border-border p-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Mono className="font-semibold">{a.tool_name}</Mono>
                  <Badge value={a.status} />
                  <Badge variant="neutral">{a.risk_level} risk</Badge>
                  {a.requires_human_approval ? <Badge variant="warning">approval required</Badge> : null}
                </div>
                <div className="text-xs text-fg-muted">
                  <Mono>{a.action_id}</Mono> · key <Mono>{a.idempotency_key}</Mono> · by {a.requested_by} · <span className="font-mono">{fmt(a.created_at)}</span>
                </div>
                {a.approvals.map((ap) => (
                  <div key={ap.approval_id} className="text-xs">
                    <Badge size="sm" value={ap.decision} /> by {ap.reviewer_id}: {ap.reason}
                  </div>
                ))}
                {a.result != null ? <CodeBlock value={a.result} maxHeight={140} label="result" /> : null}
                <div className="flex flex-wrap items-center gap-2">
                  {a.status === 'approval_required' ? (
                    canApprove ? (
                      <>
                        <ActionButton name={`approved-${a.action_id}`} busy={busy} size="sm" variant="primary" onClick={() => decide(a, 'approved')}>
                          Approve
                        </ActionButton>
                        <ActionButton name={`rejected-${a.action_id}`} busy={busy} size="sm" variant="danger" onClick={() => decide(a, 'rejected')}>
                          Reject
                        </ActionButton>
                      </>
                    ) : (
                      <span className="text-xs text-fg-muted">
                        Approve / Reject need the Manager or Admin token —{' '}
                        <button type="button" className="inline-flex items-center gap-1 text-accent underline-offset-2 hover:underline disabled:opacity-50" onClick={() => decide(a, 'approved')} disabled={busy !== null}>
                          {busy === `approved-${a.action_id}` ? <span aria-hidden className="spin inline-block size-3 rounded-full border-[1.5px] border-current border-r-transparent" /> : null}
                          try Approve as {session.roleLabel}
                        </button>{' '}
                        to see the 403.
                      </span>
                    )
                  ) : null}
                  <ActionButton name={`execute-${a.action_id}`} busy={busy} size="sm" icon={<Play />} onClick={() => execute(a)} disabled={a.status !== 'approved'} title={a.status === 'approved' ? 'run the (simulated) executor' : 'enabled only for approved actions'}>
                    Execute
                  </ActionButton>
                </div>
              </div>
            ))}
          </Card>

          <Card
            title="Trace"
            action={
              runs.length > 0 ? (
                <Select size="sm" className="max-w-[220px]" value={shownRun?.run_id ?? ''} onChange={(e) => newestRun && setPick({ newest: newestRun.run_id, runId: e.target.value })} aria-label="Agent run">
                  {runs.map((r) => (
                    <option key={r.run_id} value={r.run_id}>
                      {r.run_type} · {fmt(r.created_at)} · {r.run_id}
                    </option>
                  ))}
                </Select>
              ) : null
            }
          >
            {shownRun ? (
              <>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
                  <Badge variant="info">{shownRun.run_type}</Badge>
                  <Badge value={shownRun.status} />
                  <span>
                    {shownRun.model_provider ?? 'none'} / {shownRun.model_name ?? '—'} · {shownRun.prompt_version ?? '—'} · {shownRun.latency_ms ?? 0} ms
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-fg-muted">retrieved docs:</span>
                  {shownRun.retrieved_doc_ids.length === 0 ? <span className="text-xs text-fg-muted">none</span> : null}
                  {shownRun.retrieved_doc_ids.map((d) => (
                    <Chip key={d} onClick={() => setDocId(d)} title="open the document">
                      {d}
                    </Chip>
                  ))}
                </div>
                <CodeBlock label="guardrail_results" value={shownRun.guardrail_results} maxHeight={260} />
                <CodeBlock label="tool_calls" value={shownRun.tool_calls} maxHeight={140} />
                {shownRun.token_usage != null ? <CodeBlock label="token_usage" value={shownRun.token_usage} maxHeight={100} /> : null}
                <div className="text-xs text-fg-muted">
                  run <Mono>{shownRun.run_id}</Mono> · <span className="font-mono">{fmt(shownRun.created_at)}</span> · {runs.length >= RUNS_LIMIT ? `newest ${RUNS_LIMIT}` : `${runs.length} run${runs.length === 1 ? '' : 's'}`} for this ticket (eval_case runs are on the Evals page)
                </div>
              </>
            ) : (
              <EmptyState title="No agent runs for this ticket yet" description="Triage, draft and action requests each write an AgentRun trace (rule R7)." />
            )}
          </Card>
        </Pane>
      </div>

      <DocumentDrawer docId={docId} onClose={closeDoc} />
    </div>
  )
}

/** One of the three panes: a small sticky label and its stacked cards. */
function Pane({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className={cx('relative', className)}>
      <div className="sticky top-0 z-[1] mb-2 bg-bg pb-1 text-[11px] font-semibold tracking-wide text-fg-subtle uppercase">{title}</div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <h4 className="pt-1 text-xs font-semibold text-fg-muted">{children}</h4>
}

// Full-width guardrail banner above the draft body: allow → green check, allow_with_escalation → amber alert, refuse_and_escalate → red X.
function GuardrailBanner({ outcome, refusalReason }: { outcome: string; refusalReason: string | null }) {
  const spec =
    outcome === 'allow'
      ? { icon: <ShieldCheck className="size-4" aria-hidden />, cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200', text: 'Guardrails passed — the draft is grounded and may be sent after review.' }
      : outcome === 'allow_with_escalation'
        ? { icon: <ShieldAlert className="size-4" aria-hidden />, cls: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200', text: 'Allowed with escalation — a human must review before anything is sent or executed.' }
        : { icon: <ShieldX className="size-4" aria-hidden />, cls: 'border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200', text: 'Refused and escalated — the body is the fixed refusal template; the model was not asked.' }
  return (
    <div role="note" className={cx('flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm', spec.cls)}>
      {spec.icon}
      <Badge value={outcome} title="guardrail outcome" />
      <span className="min-w-0 flex-1">{spec.text}</span>
      {refusalReason ? <span className="w-full text-xs opacity-90">refusal reason: {refusalReason}</span> : null}
    </div>
  )
}

// Auto-filled payload per tool from the ticket's own records (the API rejects foreign ids).
function defaultFields(def: ToolCatalogItem, t: TicketDetailDto, reason?: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of def.required_fields) {
    if (f === 'idempotency_key') continue
    switch (f) {
      case 'order_id':
        out[f] = t.order?.order_id ?? ''
        break
      case 'customer_id':
        out[f] = t.customer_id
        break
      case 'ticket_id':
        out[f] = t.ticket_id
        break
      case 'sku':
        out[f] = t.order?.items[0]?.sku ?? ''
        break
      case 'tracking_number':
        out[f] = t.order?.tracking_number ?? ''
        break
      case 'amount':
        out[f] = String(def.tool_name === 'issue_coupon' ? Math.min(500, def.max_amount_inr ?? 500) : (t.order?.total ?? 0))
        break
      case 'reason':
        out[f] = reason ?? `${def.tool_name} requested from the TrustDesk UI for ${t.ticket_id}`
        break
      case 'queue':
        out[f] = 'tier2_support'
        break
      default:
        out[f] = ''
    }
  }
  return out
}
