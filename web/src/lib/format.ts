/** ISO timestamp → "2024-03-01 10:15:00Z" (millis dropped); null/undefined → em dash. */
export const fmt = (iso: string | null | undefined): string => (iso ? iso.replace('T', ' ').replace(/\.\d{3}Z$/, 'Z') : '—')

/** Metric value → three decimals; missing → em dash. */
export const num = (v: number | null | undefined): string => (v === null || v === undefined ? '—' : v.toFixed(3))
