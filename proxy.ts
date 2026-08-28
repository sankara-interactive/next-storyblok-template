import { NextRequest, NextResponse } from 'next/server'
import { negotiate } from '@/lib/accept'

// Next 16 renamed `middleware.ts` → `proxy.ts`. Sole job: Accept negotiation —
// a markdown request is rewritten to /api/md, which sets `Vary: Accept` itself.
export default function proxy(request: NextRequest) {
  // Only safe methods are negotiable: Next's own RSC and Server Action traffic
  // must never be negotiated or 406'd.
  const negotiable =
    (request.method === 'GET' || request.method === 'HEAD') && !request.headers.get('RSC')
  if (!negotiable) return NextResponse.next()

  const wanted = negotiate(request.headers.get('accept'))
  if (wanted === 'none') {
    return new NextResponse('Not Acceptable\n', {
      status: 406,
      headers: { 'content-type': 'text/plain; charset=utf-8', vary: 'Accept' },
    })
  }
  if (wanted === 'markdown') {
    const url = request.nextUrl.clone()
    url.pathname = `/api/md${url.pathname === '/' ? '' : url.pathname}`
    return NextResponse.rewrite(url)
  }
  return NextResponse.next()
}

export const config = {
  // Content routes only — skips API, Next internals and anything with a file extension.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
