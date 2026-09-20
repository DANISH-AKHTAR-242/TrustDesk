import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { ActionButton } from '../components/ActionButton.tsx'
import { useErrors } from '../components/ErrorBanner.tsx'
import { Page, PageHeader } from '../components/layout/Page.tsx'
import { Badge } from '../components/ui/Badge.tsx'
import { Card } from '../components/ui/Card.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { KeyValue, Mono } from '../components/ui/KeyValue.tsx'
import { Skeleton } from '../components/ui/Skeleton.tsx'
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table.tsx'
import { useAction } from '../components/useAction.ts'
import { api } from '../lib/api.ts'
import { fmt } from '../lib/format.ts'
import type { MetricsSummary } from '../lib/types.ts'

const ms = (v: number | null) => (v === null ? '—' : `${v} ms`)
const usd = (v: number) => `$${v.toFixed(4)}`

function Stat({ name, value, hint }: { name: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="text-xs text-fg-muted">{name}</div>
      <div className="mt-1 truncate font-mono text-2xl font-semibold tracking-tight tabular-nums" title={String(value)}>
        {value}
      </div>
      {hint ? <div className="mt-1 truncate text-xs text-fg-subtle">{hint}</div> : null}
    </div>
  )
}

// Observability (Phase 11 item 1): what GET /api/metrics/summary reports over agent_run.
export default function MetricsPage() {
  const { report } = useErrors()
  const { busy, run } = useAction()
  const [summary, setSummary] = useState<MetricsSummary | 'failed' | null>(null)

  const load = useCallback(() => {
    let cancelled = false
    api
      .metricsSummary()
      .then((s) => {
        if (!cancelled) setSummary(s)
      })
      .catch((err) => {
        if (cancelled) return
        report(err, 'GET /api/metrics/summary')
        setSummary((prev) => (prev && prev !== 'failed' ? prev : 'failed'))
      })
    return () => {
      cancelled = true
    }
  }, [report])

  useEffect(() => load(), [load])

  const refresh = () => run('refresh', async () => setSummary(await api.metricsSummary()), 'GET /api/metrics/summary')

  return (
    <Page>
      <PageHeader
        title="Metrics"
        description={summary && summary !== 'failed' ? <span>generated <span className="font-mono">{fmt(summary.generated_at)}</span></span> : 'Latency, tokens and estimated cost over every AgentRun.'}
        actions={
          <ActionButton name="refresh" busy={busy} onClick={refresh} icon={<RefreshCw />}>
            Refresh
          </ActionButton>
        }
      />

      {summary === null ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-7 w-20" />
            </div>
          ))}
        </div>
      ) : null}
      {summary === 'failed' ? <EmptyState tone="danger" title="Could not load the metrics summary" description="The error toast has the code and request id." /> : null}

      {summary && summary !== 'failed' ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat name="agent runs" value={summary.runs_total} />
            <Stat name="p50 latency" value={ms(summary.latency.p50_ms)} />
            <Stat name="p95 latency" value={ms(summary.latency.p95_ms)} />
            <Stat name="tokens" value={summary.tokens.total} hint={`prompt ${summary.tokens.prompt} + completion ${summary.tokens.completion}`} />
            <Stat name="estimated cost" value={usd(summary.estimated_cost_usd.total)} hint={`${summary.estimated_cost_usd.runs_priced} priced, ${summary.estimated_cost_usd.runs_unpriced} unpriced`} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card title="Runs per type" padded={false} className="lg:col-span-1">
              <Table>
                <THead>
                  <tr>
                    <TH>Run type</TH>
                    <TH>Runs</TH>
                    <TH>p50</TH>
                    <TH>p95</TH>
                    <TH>max</TH>
                  </tr>
                </THead>
                <TBody>
                  {Object.entries(summary.runs_by_type).map(([type, n]) => {
                    const l = summary.latency.by_type[type]
                    return (
                      <TR key={type}>
                        <TD>
                          <Badge variant="info">{type}</Badge>
                        </TD>
                        <TD className="font-mono text-[12px]">{n}</TD>
                        <TD className="font-mono text-[12px] whitespace-nowrap">{ms(l?.p50_ms ?? null)}</TD>
                        <TD className="font-mono text-[12px] whitespace-nowrap">{ms(l?.p95_ms ?? null)}</TD>
                        <TD className="font-mono text-[12px] whitespace-nowrap">{ms(l?.max_ms ?? null)}</TD>
                      </TR>
                    )
                  })}
                  {Object.keys(summary.runs_by_type).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4">
                        <EmptyState title="No agent runs yet" description="Triage a ticket or run an evaluation." />
                      </td>
                    </tr>
                  ) : null}
                </TBody>
              </Table>
              <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5 text-xs">
                <span className="text-fg-muted">by status</span>
                {Object.entries(summary.runs_by_status).map(([status, n]) => (
                  <span key={status} className="inline-flex items-center gap-1">
                    <Badge size="sm" value={status} /> <span className="font-mono">{n}</span>
                  </span>
                ))}
              </div>
            </Card>

            <Card title="Tokens and cost by model" padded={false} className="lg:col-span-1">
              <Table>
                <THead>
                  <tr>
                    <TH>Model</TH>
                    <TH>Calls</TH>
                    <TH>Prompt</TH>
                    <TH>Completion</TH>
                    <TH>Est. cost</TH>
                  </tr>
                </THead>
                <TBody>
                  {Object.entries(summary.tokens.by_model).map(([model, t]) => (
                    <TR key={model}>
                      <TD>
                        <Mono>{model}</Mono>
                      </TD>
                      <TD className="font-mono text-[12px]">{t.runs}</TD>
                      <TD className="font-mono text-[12px]">{t.prompt}</TD>
                      <TD className="font-mono text-[12px]">{t.completion}</TD>
                      <TD className="font-mono text-[12px]">{model in summary.estimated_cost_usd.by_model ? usd(summary.estimated_cost_usd.by_model[model]!) : <span className="text-fg-muted">not priced</span>}</TD>
                    </TR>
                  ))}
                  {Object.keys(summary.tokens.by_model).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4">
                        <EmptyState title="No model calls recorded yet" />
                      </td>
                    </tr>
                  ) : null}
                </TBody>
              </Table>
            </Card>

            <Card title="Pricing" className="lg:col-span-1">
              <KeyValue
                rows={[
                  ['source', summary.pricing.source === 'env' ? 'AI_PRICE_TABLE_JSON override + defaults' : 'defaults (server/src/ai/pricing.ts)'],
                  ['priced models', <span key="m" className="font-mono text-[12px]">{summary.pricing.models.join(', ')}</span>],
                ]}
              />
              <p className="text-xs text-fg-muted">{summary.pricing.note}</p>
            </Card>
          </div>
        </>
      ) : null}
    </Page>
  )
}
