/** Accept negotiation per RFC 9110 §12.5.1 (acceptmarkdown.com). Used by proxy.ts. */
export type Negotiated = 'markdown' | 'html' | 'none'

const MARKDOWN_TYPES = ['text/markdown', 'text/x-markdown']
// `text/x-component` is HTML: Server Actions and RSC send it, and the `RSC`
// header does not always reach the proxy.
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

/** Quality for one media type; the most specific matching range wins over the highest q. */
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

/** `html` when there is no usable Accept header — never break a plain request. */
export function negotiate(header: string | null | undefined): Negotiated {
  if (!header?.trim()) return 'html'
  const ranges = parseRanges(header)
  if (!ranges.length) return 'html'
  const markdown = Math.max(...MARKDOWN_TYPES.map(t => qualityOf(ranges, t)))
  const html = Math.max(...HTML_TYPES.map(t => qualityOf(ranges, t)))
  if (markdown === 0 && html === 0) return 'none'
  // Ties go to HTML: a browser sending `*/*` must never get markdown.
  return markdown > html ? 'markdown' : 'html'
}
