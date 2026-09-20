import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { QUARANTINE_LABEL, QuarantineBanner } from '../components/DocumentDrawer.tsx'
import { useErrors } from '../components/ErrorBanner.tsx'
import { Page, PageHeader } from '../components/layout/Page.tsx'
import { Badge } from '../components/ui/Badge.tsx'
import { Card } from '../components/ui/Card.tsx'
import { CodeBlock } from '../components/ui/CodeBlock.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { KeyValue, Mono } from '../components/ui/KeyValue.tsx'
import { SkeletonRows, SkeletonText } from '../components/ui/Skeleton.tsx'
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table.tsx'
import { api } from '../lib/api.ts'
import { fmt } from '../lib/format.ts'
import type { DocumentDetail, DocumentListItem } from '../lib/types.ts'

// Rule R4 made visible: quarantined documents are listed and readable, but flagged in rose.
export default function DocumentsPage() {
  const { report } = useErrors()
  // null = loading, 'failed' = the load failed (the toast has the error), else the list
  const [docs, setDocs] = useState<DocumentListItem[] | 'failed' | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  // The detail is tagged with the id it was loaded for, so switching documents shows the skeleton without a reset.
  const [loaded, setLoaded] = useState<{ docId: string; doc: DocumentDetail } | null>(null)
  const doc = loaded?.docId === openId ? loaded.doc : null

  useEffect(() => {
    let cancelled = false
    api
      .listDocuments()
      .then((r) => {
        if (!cancelled) setDocs(r.items)
      })
      .catch((err) => {
        if (cancelled) return
        report(err, 'GET /api/documents')
        setDocs('failed')
      })
    return () => {
      cancelled = true
    }
  }, [report])

  useEffect(() => {
    if (!openId) return
    let cancelled = false
    api
      .getDocument(openId)
      .then((d) => {
        if (!cancelled) setLoaded({ docId: openId, doc: d })
      })
      .catch((err) => {
        if (cancelled) return
        report(err, `GET /api/documents/${openId}`)
        setOpenId(null)
      })
    return () => {
      cancelled = true
    }
  }, [openId, report])

  const items = Array.isArray(docs) ? docs : null

  return (
    <Page wide>
      <PageHeader title="Knowledge base documents" description={docs === null ? 'loading…' : docs === 'failed' ? 'could not load documents (see the error toast)' : `${docs.length} documents · select a row to read it`} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Card padded={false} className="min-w-0 self-start">
          <Table>
            <THead>
              <tr>
                <TH>Doc id</TH>
                <TH className="w-full">Title</TH>
                <TH>Version</TH>
                <TH>Audience</TH>
                <TH>Trust</TH>
                <TH>Chunks</TH>
              </tr>
            </THead>
            <TBody>
              {docs === null ? <SkeletonRows cols={6} rows={8} /> : null}
              {docs === 'failed' ? (
                <tr>
                  <td colSpan={6} className="p-4">
                    <EmptyState tone="danger" title="Could not load documents" description="The error toast has the code and request id." />
                  </td>
                </tr>
              ) : null}
              {items?.map((d) => (
                <TR key={d.doc_id} onSelect={() => setOpenId(d.doc_id)} selected={openId === d.doc_id} flagged={d.quarantined}>
                  <TD className="whitespace-nowrap">
                    <Mono>{d.doc_id}</Mono>
                  </TD>
                  <TD>
                    <div className="font-medium">{d.title}</div>
                    {d.quarantined ? (
                      <Badge size="sm" variant="danger" className="mt-0.5">
                        {QUARANTINE_LABEL}
                      </Badge>
                    ) : null}
                  </TD>
                  <TD className="font-mono text-[12px]">{d.version}</TD>
                  <TD className="whitespace-nowrap text-xs text-fg-muted">{d.audience}</TD>
                  <TD>
                    <Badge value={d.trust_level} />
                  </TD>
                  <TD>{d.chunk_count}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        <div className="min-w-0">
          {!openId ? (
            <EmptyState icon={<BookOpen />} title="Select a document" description="Metadata, trust level and the full markdown appear here. Quarantined documents are readable but never used for grounding." className="min-h-[280px]" />
          ) : !doc ? (
            <Card title={<Mono>{openId}</Mono>}>
              <SkeletonText lines={8} />
            </Card>
          ) : (
            <Card
              title={doc.title}
              description={<Mono className="text-fg-muted">{doc.doc_id}</Mono>}
              tone={doc.quarantined ? 'danger' : 'default'}
              action={
                <>
                  <Badge value={doc.trust_level} />
                  {doc.quarantined ? <Badge variant="danger">{QUARANTINE_LABEL}</Badge> : <Badge variant="success">usable for grounding</Badge>}
                </>
              }
            >
              {doc.quarantined ? <QuarantineBanner /> : null}
              <KeyValue
                rows={[
                  ['doc_id', <Mono key="id">{doc.doc_id}</Mono>],
                  ['version', doc.version],
                  ['audience', doc.audience],
                  ['trust level', <Badge key="trust" value={doc.trust_level} />],
                  ['source', <Mono key="src">{doc.source_path}</Mono>],
                  ['updated', fmt(doc.updated_at)],
                  ['chunks', String(doc.chunk_count)],
                ]}
              />
              <CodeBlock value={doc.content} wrap maxHeight={640} label="content (markdown)" />
            </Card>
          )}
        </div>
      </div>
    </Page>
  )
}
