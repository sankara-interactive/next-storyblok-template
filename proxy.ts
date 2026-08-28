import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { negotiate } from '@/lib/accept'
import { routing } from '@/i18n/routing'

const handleI18nRouting = createMiddleware(routing)

// Next 16 renamed `middleware.ts` → `proxy.ts` (function `middleware` → `proxy`).
// Accept negotiation (acceptmarkdown.com) runs first: an agent asking for
// text/markdown is rewritten to /api/md, which sets `Vary: Accept` itself. The
// HTML variant carries no such header and can't — Next overwrites `vary` with
// its RSC list on every page response, so neither a proxy header nor a
// next.config `headers()` entry survives. Harmless: this runs before the CDN
// cache lookup, so a markdown request never reads the cached HTML entry.
// Everything else falls through to next-intl locale routing.
export default function proxy(request: NextRequest) {
  // Only safe methods are negotiable. Server Actions POST to the page URL with
  // `Accept: text/x-component` and RSC navigation GETs the same — Next's own
  // traffic, which must never be negotiated or 406'd.
  const negotiable =
    (request.method === 'GET' || request.method === 'HEAD') && !request.headers.get('RSC')

  if (negotiable) {
    const wanted = negotiate(request.headers.get('accept'))
    if (wanted === 'none') {
      return new NextResponse('Not Acceptable\n', {
        status: 406,
        headers: { 'content-type': 'text/plain; charset=utf-8', vary: 'Accept' },
      })
    }
    if (wanted === 'markdown') {
      // The locale prefix stays in the path; the markdown route splits it off,
      // so /fr/x is served as French markdown rather than 404ing.
      const url = request.nextUrl.clone()
      url.pathname = `/api/md${url.pathname === '/' ? '' : url.pathname}`
      return NextResponse.rewrite(url)
    }
  }

  return handleI18nRouting(request)
}

export const config = {
  // Content routes only — skip API, Next internals, and anything with a file
  // extension (static assets, /sitemap.xml, /robots.txt, /llms.txt).
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
