import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { negotiate } from '@/lib/accept'
import { routing } from '@/i18n/routing'

const handleI18nRouting = createMiddleware(routing)

// Next 16 renamed `middleware.ts` → `proxy.ts`. Accept negotiation runs first —
// a markdown request is rewritten to /api/md — then next-intl locale routing.
export default function proxy(request: NextRequest) {
  // Only safe methods are negotiable: Next's own RSC and Server Action traffic
  // must never be negotiated or 406'd.
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
  // Content routes only — skips API, Next internals and anything with a file extension.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
