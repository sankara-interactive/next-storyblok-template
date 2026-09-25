/** Accept negotiation per RFC 9110 section 12.5.1. */
export type Negotiated = 'markdown' | 'html' | 'none'

const MARKDOWN_TYPES = ['text/markdown', 'text/x-markdown']
// Server Actions and RSC requests use text/x-component.
const HTML_TYPES = ['text/html', 'application/xhtml+xml', 'text/x-component']

type Range = { range: string; q: number }

function parseRanges(header: string): Range[] {
  return header
    .split(',')
    .map(part => {
      const [range, ...params] = part.split(';')
      const qParam = params.map(p => p.trim()).find(p => p.toLowerCase().startsWith('q='))
      const q = qParam ? Number(qParam.slice(2)) : 1
      return {
        range: range.trim().toLowerCase(),
        q: Number.isFinite(q) ? Math.min(Math.max(q, 0), 1) : 1,
      }
    })
    .filter(r => r.range.includes('/'))
}

/** Return the quality for a media type using the most specific matching range. */
function qualityOf(ranges: Range[], mime: string): number {
  const type = mime.split('/')[0]
  let bestSpecificity = 0
  let bestQ = 0
  for (const r of ranges) {
    const specificity =
      r.range === mime ? 3 : r.range === `${type}/*` ? 2 : r.range === '*/*' ? 1 : 0
    if (specificity === 0) continue
    if (specificity > bestSpecificity || (specificity === bestSpecificity && r.q > bestQ)) {
      bestSpecificity = specificity
      bestQ = r.q
    }
  }
  return bestQ
}

/** Use HTML when the Accept header is absent or invalid. */
export function negotiate(header: string | null | undefined): Negotiated {
  if (!header?.trim()) return 'html'
  const ranges = parseRanges(header)
  if (!ranges.length) return 'html'
  const markdown = Math.max(...MARKDOWN_TYPES.map(t => qualityOf(ranges, t)))
  const html = Math.max(...HTML_TYPES.map(t => qualityOf(ranges, t)))
  if (markdown === 0 && html === 0) return 'none'
  // Prefer HTML when both formats have the same quality.
  return markdown > html ? 'markdown' : 'html'
}
