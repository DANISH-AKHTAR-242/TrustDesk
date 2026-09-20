// Side drawer showing one knowledge document (used by the citation chips and the trace panel).
import { useEffect, useState } from 'react'
import { ShieldX } from 'lucide-react'
import { api } from '../lib/api.ts'
import { fmt } from '../lib/format.ts'
import type { DocumentDetail } from '../lib/types.ts'
import { useErrors } from './ErrorBanner.tsx'
import { Badge } from './ui/Badge.tsx'
import { CodeBlock } from './ui/CodeBlock.tsx'
import { Drawer } from './ui/Drawer.tsx'
import { KeyValue } from './ui/KeyValue.tsx'
import { SkeletonText } from './ui/Skeleton.tsx'

export const QUARANTINE_LABEL = 'quarantined — never used for grounding'

/** Full-width rose banner for a quarantined document (rule R4 made visible). */
export function QuarantineBanner() {
  return (
    <div role="note" className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
      <ShieldX className="size-4 shrink-0" />
      <span>
        <strong>Quarantined.</strong> Ingested for inspection only: never returned as grounding context, never cited (rule R4).
      </span>
    </div>
  )
}

export function DocumentDrawer({ docId, onClose }: { docId: string | null; onClose: () => void }) {
  const { report } = useErrors()
  // Tagged with the id it was loaded for, so switching documents shows the skeleton without a reset.
  const [loaded, setLoaded] = useState<{ docId: string; doc: DocumentDetail } | null>(null)
  const doc = loaded?.docId === docId ? loaded.doc : null

  useEffect(() => {
    if (!docId) return
    let cancelled = false
    api
      .getDocument(docId)
      .then((d) => {
        if (!cancelled) setLoaded({ docId, doc: d })
      })
      .catch((err) => {
        if (!cancelled) {
          report(err, `GET /api/documents/${docId}`)
          onClose()
        }
      })
    return () => {
      cancelled = true
    }
  }, [docId, report, onClose])

  return (
    <Drawer open={docId !== null} title={doc ? doc.title : (docId ?? '')} description={doc ? <span className="font-mono">{doc.doc_id}</span> : 'loading document'} onClose={onClose} width="lg">
      {doc ? (
        <>
          {doc.quarantined ? <QuarantineBanner /> : null}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge value={doc.trust_level} />
            {doc.quarantined ? <Badge variant="danger">{QUARANTINE_LABEL}</Badge> : <Badge variant="success">usable for grounding</Badge>}
          </div>
          <KeyValue
            rows={[
              ['version', doc.version],
              ['audience', doc.audience],
              ['source', <span key="src" className="font-mono text-[12px]">{doc.source_path}</span>],
              ['updated', fmt(doc.updated_at)],
              ['chunks', String(doc.chunk_count)],
            ]}
          />
          <CodeBlock value={doc.content} wrap maxHeight={9999} label="content (markdown)" />
        </>
      ) : (
        <SkeletonText lines={8} />
      )}
    </Drawer>
  )
}
