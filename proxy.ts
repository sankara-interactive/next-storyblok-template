import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { negotiate } from '@/lib/accept'
import { routing } from '@/i18n/routing'

const handleI18nRouting = createMiddleware(routing)

// Accept negotiation runs before next-intl routing and rewrites Markdown
// requests to /api/md.
export default function proxy(request: NextRequest) {
  // Only GET and HEAD requests without RSC headers are negotiable.
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
      // Preserve the locale prefix for the Markdown route.
      const url = request.nextUrl.clone()
      url.pathname = `/api/md${url.pathname === '/' ? '' : url.pathname}`
      return NextResponse.rewrite(url)
    }
  }

  return handleI18nRouting(request)
}

export const config = {
  // Match content routes; exclude API, Next internals, and file paths.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
