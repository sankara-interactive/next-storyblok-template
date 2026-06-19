# Template Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden `next-storyblok-template` into a fast, secure, reusable base for Storyblok marketing sites (driven by numbers.ch).

**Architecture:** Next 16 App Router, RSC-first. All Storyblok reads go through one server-only, cache-tagged fetch helper. Revalidation is a single global cache-tag flush from a signature-verified webhook. The Storyblok bridge loads only in preview. SEO/sitemap/robots/redirects/404 are first-class. `data/` stories are globals, never public pages.

**Tech Stack:** Next 16.1.6, React 19, `@storyblok/react` 5 (RSC), `storyblok-js-client`, Tailwind 4, TypeScript 5 (strict), Yarn 4, Vitest (new), Node 22.

## Global Constraints

- Node `^22.14.0`; package manager `yarn@4.7.0`. Run scripts via `yarn`.
- TypeScript `strict: true` — no `any` in Storyblok components (use generated `{Name}Storyblok` types).
- Server-only Storyblok fetching — the CMS access path must never enter a client bundle.
- The Storyblok bridge MUST NOT ship in the production client bundle.
- One global cache tag for all Storyblok reads: `STORYBLOK_CACHE_TAG = 'storyblok'`. Every Storyblok fetch must carry it.
- Globals live under the `data/` slug prefix and are never routable as public pages.
- Commit after every task. Branch: `feat/storyblok-patterns-hardening` (already checked out).
- Spec: `docs/superpowers/specs/2026-06-19-numbers-storyblok-build-design.md`.

---

### Task 1: Dev tooling + central config + route helper

**Files:**
- Modify: `package.json` (add vitest + scripts)
- Create: `vitest.config.ts`
- Create: `lib/config.ts`
- Create: `lib/storyblok-routes.ts`
- Create: `lib/storyblok-routes.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `MODE`, `isPreview`, `SITE_URL`, `SITE_NAME`, `STORYBLOK_CACHE_TAG`, `DATA_PREFIX` (from `lib/config.ts`); `isDataRoute(slug: string): boolean` (from `lib/storyblok-routes.ts`).

- [ ] **Step 1: Add Vitest and scripts to `package.json`**

In `devDependencies` add `"vitest": "^3.0.0"`. Replace the `scripts` block with:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "sync": "storyblok components pull && storyblok types generate",
    "scaffold": "node generators/cli.js .storyblok/components/$STORYBLOK_SPACE_ID/components.json"
  },
```

Run: `yarn install`
Expected: vitest resolves, lockfile updates.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Create `lib/config.ts`**

```ts
type Mode = 'preview' | 'live'

export const MODE: Mode = process.env.MODE === 'preview' ? 'preview' : 'live'
export const isPreview = MODE === 'preview'

export const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3000'
export const SITE_NAME = process.env.SITE_NAME ?? 'Site'

/** Single cache tag for every Storyblok read; flushed on publish. */
export const STORYBLOK_CACHE_TAG = 'storyblok'

/** Top-level Storyblok folder holding non-routable global stories. */
export const DATA_PREFIX = 'data'
```

- [ ] **Step 4: Write the failing test `lib/storyblok-routes.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { isDataRoute } from './storyblok-routes'

describe('isDataRoute', () => {
  it('flags the data folder root', () => {
    expect(isDataRoute('data')).toBe(true)
  })
  it('flags stories under data/', () => {
    expect(isDataRoute('data/menu')).toBe(true)
    expect(isDataRoute('data/team/jane')).toBe(true)
  })
  it('does not flag normal pages', () => {
    expect(isDataRoute('home')).toBe(false)
    expect(isDataRoute('datenschutz')).toBe(false) // prefix collision guard
    expect(isDataRoute('about/data')).toBe(false)
  })
})
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `yarn test lib/storyblok-routes.test.ts`
Expected: FAIL — cannot find module `./storyblok-routes`.

- [ ] **Step 6: Create `lib/storyblok-routes.ts`**

```ts
import { DATA_PREFIX } from './config'

/** True if a slug is the data/ globals folder or a story inside it. */
export function isDataRoute(slug: string): boolean {
  return slug === DATA_PREFIX || slug.startsWith(`${DATA_PREFIX}/`)
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `yarn test lib/storyblok-routes.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 8: Update `.env.example`**

```bash
# Storyblok
STORYBLOK_SPACE_ID=<your-space-id>
NEXT_PUBLIC_STORYBLOK_TOKEN=<your-public-token>
STORYBLOK_PREVIEW_TOKEN=<your-preview-token>
STORYBLOK_OAUTH_TOKEN=<your-management-api-oauth-token>

# Auth / webhooks
API_SECRET=<draft-route-secret>
STORYBLOK_WEBHOOK_SECRET=<storyblok-webhook-signing-secret>

# Site
SITE_URL=https://example.ch
SITE_NAME=Example
# 'preview' = drafts + noindex + bridge; 'live' = published + indexable
MODE=live
```

- [ ] **Step 9: Commit**

```bash
git add package.json yarn.lock vitest.config.ts lib/config.ts lib/storyblok-routes.ts lib/storyblok-routes.test.ts .env.example
git commit -m "chore: add vitest, central config, and data-route helper"
```

---

### Task 2: Server-only, cache-tagged Storyblok fetch helper

Replaces the inline `fetchData` in `app/[...slug]/page.tsx`. Live reads are wrapped in `unstable_cache` tagged with `STORYBLOK_CACHE_TAG` so a single `revalidateTag` flush works regardless of the SDK's HTTP client. Draft reads bypass the cache.

**Files:**
- Create: `lib/storyblok-api.ts`
- Create: `lib/storyblok-api.test.ts`

**Interfaces:**
- Consumes: `getStoryblokApi` (`lib/storyblok.ts`), `STORYBLOK_CACHE_TAG` (`lib/config.ts`).
- Produces:
  - `resolveVersion(isDraft: boolean): 'draft' | 'published'`
  - `getStory<T>(slug: string): Promise<ISbStoryData<T> | null>`
  - `getAllLinks(): Promise<Record<string, SbLink>>` where `SbLink = { slug: string; is_folder: boolean }`

- [ ] **Step 1: Write the failing test `lib/storyblok-api.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { resolveVersion } from './storyblok-api'

describe('resolveVersion', () => {
  it('returns draft when draft mode is on', () => {
    expect(resolveVersion(true)).toBe('draft')
  })
  it('returns published otherwise', () => {
    expect(resolveVersion(false)).toBe('published')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test lib/storyblok-api.test.ts`
Expected: FAIL — cannot find module `./storyblok-api`.

- [ ] **Step 3: Create `lib/storyblok-api.ts`**

```ts
import 'server-only'
import { ISbStoryData } from '@storyblok/react/rsc'
import { unstable_cache } from 'next/cache'
import { draftMode } from 'next/headers'
import { STORYBLOK_CACHE_TAG } from './config'
import { getStoryblokApi } from './storyblok'

export type SbLink = { slug: string; is_folder: boolean }

const isDev = process.env.NODE_ENV === 'development'

export function resolveVersion(isDraft: boolean): 'draft' | 'published' {
  return isDev || isDraft ? 'draft' : 'published'
}

const fetchPublishedStory = unstable_cache(
  async (slug: string) => {
    const api = getStoryblokApi()
    const { data } = await api.get(`cdn/stories/${slug}`, {
      version: 'published',
      resolve_links: 'url',
    })
    return data.story
  },
  ['storyblok-story'],
  { tags: [STORYBLOK_CACHE_TAG] },
)

export async function getStory<T>(slug: string): Promise<ISbStoryData<T> | null> {
  const { isEnabled: isDraft } = await draftMode()
  const version = resolveVersion(isDraft)
  try {
    if (version === 'draft') {
      const api = getStoryblokApi()
      const { data } = await api.get(`cdn/stories/${slug}`, {
        version: 'draft',
        resolve_links: 'url',
        cv: Date.now(),
      })
      return data.story as ISbStoryData<T>
    }
    return (await fetchPublishedStory(slug)) as ISbStoryData<T>
  } catch {
    return null
  }
}

const fetchLinks = unstable_cache(
  async () => {
    const api = getStoryblokApi()
    const { data } = await api.get('cdn/links/', { version: 'published' })
    return data.links as Record<string, SbLink>
  },
  ['storyblok-links'],
  { tags: [STORYBLOK_CACHE_TAG] },
)

export async function getAllLinks(): Promise<Record<string, SbLink>> {
  return fetchLinks()
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test lib/storyblok-api.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/storyblok-api.ts lib/storyblok-api.test.ts
git commit -m "feat: server-only cache-tagged storyblok fetch helper"
```

---

### Task 3: Route the page through the helper + reject `data/`

**Files:**
- Modify: `app/[...slug]/page.tsx`

**Interfaces:**
- Consumes: `getStory`, `getAllLinks` (Task 2); `isDataRoute` (Task 1).

- [ ] **Step 1: Replace the top imports + `fetchData` + `generateStaticParams` in `app/[...slug]/page.tsx`**

Replace everything from the imports down to the end of `generateStaticParams()` with:

```tsx
import { ISbStoryData, StoryblokStory } from '@storyblok/react/rsc'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Logo from '../../components/layout/Logo'
import { getAllLinks, getStory } from '../../lib/storyblok-api'
import { isDataRoute } from '../../lib/storyblok-routes'
import { PageStoryblok } from '@storyblok-component-types'

export type ContentType = PageStoryblok // add more content types if needed

export const revalidate = 3600
export const dynamicParams = true

type Props = {
  params: Promise<{ slug?: string[] }>
}

function slugFromParams(slug?: string[]): string {
  return slug && slug.length ? slug.join('/') : 'home'
}

export async function generateStaticParams() {
  const links = await getAllLinks()
  const paths: { slug: string[] }[] = []
  Object.values(links).forEach(link => {
    if (link.is_folder || link.slug === 'home' || isDataRoute(link.slug)) return
    paths.push({ slug: link.slug.split('/') })
  })
  return paths
}
```

- [ ] **Step 2: Replace `generateMetadata` signature body head and `Home` to use the helper + reject `data/`**

Keep the existing `generateMetadata` body for now (Task 7 rewrites it), but change its data source. Replace the first lines of `generateMetadata` (the `const params...` through `const { story } = ...`) with:

```tsx
export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const slug = slugFromParams(params.slug)
  if (isDataRoute(slug)) return {}
  const story = await getStory<ContentType>(slug)
```

(Adjust the rest of the existing `generateMetadata` body: it referenced `story` from `{ story }` — it now is `story` directly. The `if (!story) return {}` line stays.)

Replace the `Home` component with:

```tsx
export default async function Home(props: Props) {
  const params = await props.params
  const slug = slugFromParams(params.slug)
  if (isDataRoute(slug)) notFound()

  const story = await getStory<ContentType>(slug)
  if (!story) notFound()

  return (
    <>
      <nav className="container w-full mx-auto p-4">
        <div className="flex justify-center">
          <Logo />
        </div>
      </nav>
      <StoryblokStory story={story as ISbStoryData} />
      <footer className="p-4">Your Footer</footer>
    </>
  )
}
```

- [ ] **Step 3: Verify the build typechecks**

Run: `yarn build`
Expected: compiles without type errors (a Storyblok token may be needed; if the build fetches, run with `.env` populated or expect the fetch step to be the only failure — typecheck must pass).

- [ ] **Step 4: Commit**

```bash
git add "app/[...slug]/page.tsx"
git commit -m "feat: route pages through tagged helper and reject data/ routes"
```

---

### Task 4: Gate the Storyblok bridge to preview only

The bridge currently loads for every visitor via `StoryblokProvider` in the root layout. Load it only when draft mode is on (preview).

**Files:**
- Modify: `components/StoryblokProvider.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `StoryblokProvider` accepts `{ bridge: boolean; children }`.

- [ ] **Step 1: Rewrite `components/StoryblokProvider.tsx`**

```tsx
'use client'

import { useEffect } from 'react'
import { getStoryblokApi } from '../lib/storyblok'

export default function StoryblokProvider({
  bridge,
  children,
}: {
  bridge: boolean
  children: React.ReactNode
}) {
  useEffect(() => {
    if (bridge) getStoryblokApi()
  }, [bridge])
  return children
}
```

- [ ] **Step 2: Rewrite `app/layout.tsx` to pass `bridge` from server draft state**

```tsx
import { draftMode } from 'next/headers'
import { ReactNode } from 'react'
import StoryblokProvider from '../components/StoryblokProvider'
import '../styles/globals.css'

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { isEnabled: bridge } = await draftMode()
  return (
    <html lang="de-CH">
      <body>
        <StoryblokProvider bridge={bridge}>{children}</StoryblokProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Verify the bridge is absent from the production client bundle**

Run: `yarn build && grep -rl "storyblok-js-bridge\|app.storyblok.com/f/storyblok-v2-latest" .next/static 2>/dev/null; echo "exit=$?"`
Expected: no file matches (grep prints nothing). The bridge script is only injected by `getStoryblokApi()` at runtime when `bridge` is true.

- [ ] **Step 4: Commit**

```bash
git add components/StoryblokProvider.tsx app/layout.tsx
git commit -m "perf: load storyblok bridge only in preview/draft"
```

---

### Task 5: Harden the revalidation webhook (signature + tag-flush)

Rename `story-published` → `revalidate`, verify Storyblok's `webhook-signature` (HMAC-SHA1 of the raw body) in constant time, and `await revalidateTag` before returning 200.

**Files:**
- Create: `lib/webhook.ts`
- Create: `lib/webhook.test.ts`
- Create: `app/api/revalidate/route.ts`
- Delete: `app/api/story-published/route.ts`

**Interfaces:**
- Produces: `verifyWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean`.

- [ ] **Step 1: Write the failing test `lib/webhook.test.ts`**

```ts
import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyWebhookSignature } from './webhook'

const secret = 'topsecret'
const body = JSON.stringify({ story_id: 42, action: 'published' })
const sign = (b: string, s: string) => createHmac('sha1', s).update(b).digest('hex')

describe('verifyWebhookSignature', () => {
  it('accepts a correct signature', () => {
    expect(verifyWebhookSignature(body, sign(body, secret), secret)).toBe(true)
  })
  it('rejects a wrong signature', () => {
    expect(verifyWebhookSignature(body, sign(body, 'wrong'), secret)).toBe(false)
  })
  it('rejects a missing signature', () => {
    expect(verifyWebhookSignature(body, null, secret)).toBe(false)
  })
  it('rejects when body is tampered', () => {
    expect(verifyWebhookSignature(body + ' ', sign(body, secret), secret)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test lib/webhook.test.ts`
Expected: FAIL — cannot find module `./webhook`.

- [ ] **Step 3: Create `lib/webhook.ts`**

```ts
import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !secret) return false
  const expected = createHmac('sha1', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test lib/webhook.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Create `app/api/revalidate/route.ts`**

```ts
import { revalidateTag } from 'next/cache'
import { STORYBLOK_CACHE_TAG } from '../../../lib/config'
import { verifyWebhookSignature } from '../../../lib/webhook'

export async function POST(req: Request) {
  const raw = await req.text()
  const signature = req.headers.get('webhook-signature')
  const secret = process.env.STORYBLOK_WEBHOOK_SECRET ?? ''

  if (!verifyWebhookSignature(raw, signature, secret)) {
    return new Response('Invalid signature', { status: 401 })
  }

  try {
    JSON.parse(raw) // hardened parse; payload not otherwise needed for a tag flush
  } catch {
    return new Response('Invalid body', { status: 400 })
  }

  revalidateTag(STORYBLOK_CACHE_TAG)
  return new Response('Revalidated', { status: 200 })
}
```

- [ ] **Step 6: Delete the old route**

```bash
git rm app/api/story-published/route.ts
```

- [ ] **Step 7: Verify build**

Run: `yarn build`
Expected: compiles; `/api/revalidate` appears in the route list.

- [ ] **Step 8: Commit**

```bash
git add lib/webhook.ts lib/webhook.test.ts app/api/revalidate/route.ts
git commit -m "feat: signature-verified webhook with global tag-flush revalidation"
```

---

### Task 6: Harden the draft route (strip secret, reject `data/`)

**Files:**
- Modify: `app/api/draft/route.ts`
- Create: `lib/draft.ts`
- Create: `lib/draft.test.ts`

**Interfaces:**
- Produces: `bridgeParams(searchParams: URLSearchParams): string` — returns only the Storyblok bridge params (`_storyblok*`), never `secret`/`slug`.
- Consumes: `isDataRoute` (Task 1).

- [ ] **Step 1: Write the failing test `lib/draft.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { bridgeParams } from './draft'

describe('bridgeParams', () => {
  it('keeps only _storyblok* params', () => {
    const sp = new URLSearchParams(
      'secret=abc&slug=home&_storyblok=1&_storyblok_tk[token]=x&foo=bar',
    )
    const out = new URLSearchParams(bridgeParams(sp))
    expect(out.get('secret')).toBeNull()
    expect(out.get('slug')).toBeNull()
    expect(out.get('foo')).toBeNull()
    expect(out.get('_storyblok')).toBe('1')
    expect(out.get('_storyblok_tk[token]')).toBe('x')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test lib/draft.test.ts`
Expected: FAIL — cannot find module `./draft`.

- [ ] **Step 3: Create `lib/draft.ts`**

```ts
/** Returns a query string of only the Storyblok bridge params (never secret/slug). */
export function bridgeParams(searchParams: URLSearchParams): string {
  const out = new URLSearchParams()
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith('_storyblok')) out.append(key, value)
  }
  return out.toString()
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test lib/draft.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Rewrite `app/api/draft/route.ts`**

```ts
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import StoryblokClient from 'storyblok-js-client'
import { bridgeParams } from '../../../lib/draft'
import { isDataRoute } from '../../../lib/storyblok-routes'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const slug = searchParams.get('slug')

  if (secret !== process.env.API_SECRET || !slug) {
    return new Response('Invalid token', { status: 401 })
  }

  const storyblok = new StoryblokClient({
    accessToken: process.env.STORYBLOK_PREVIEW_TOKEN,
  })
  const { data } = await storyblok.get(`cdn/stories/${slug}`, {
    version: 'draft',
    excluding_fields: 'body',
  })
  if (!data?.story) {
    return new Response('Invalid slug', { status: 401 })
  }

  const fullSlug: string = data.story.full_slug
  if (isDataRoute(fullSlug)) {
    return new Response('Not previewable as a page', { status: 400 })
  }

  const draft = await draftMode()
  draft.enable()

  // Forward ONLY the bridge params; never the secret.
  const bridge = bridgeParams(searchParams)
  redirect(`/${fullSlug}${bridge ? `?${bridge}` : ''}`)
}
```

- [ ] **Step 6: Verify build**

Run: `yarn build`
Expected: compiles.

- [ ] **Step 7: Commit**

```bash
git add app/api/draft/route.ts lib/draft.ts lib/draft.test.ts
git commit -m "fix: draft route strips secret and rejects data/ routes"
```

---

### Task 7: Config-driven SEO metadata

Remove the hardcoded `your-brand.ch` / `Your Brand`; drive from `SITE_URL`/`SITE_NAME`; canonical + OG image fallback; `noindex` in preview.

**Files:**
- Modify: `app/[...slug]/page.tsx` (the `generateMetadata` function)

**Interfaces:**
- Consumes: `SITE_URL`, `SITE_NAME`, `isPreview` (Task 1); story shape `content.seo.{ title, description, og_image, og_title, og_description }`.

- [ ] **Step 1: Add config import to the page**

In `app/[...slug]/page.tsx` add to the imports:

```tsx
import { SITE_NAME, SITE_URL, isPreview } from '../../lib/config'
```

- [ ] **Step 2: Replace the whole `generateMetadata` function**

```tsx
export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const slug = slugFromParams(params.slug)
  if (isDataRoute(slug)) return { robots: { index: false, follow: false } }

  const story = await getStory<ContentType>(slug)
  if (!story) return {}

  const seo = (story.content as { seo?: Record<string, string> }).seo ?? {}
  const title = seo.title || story.name
  const description = seo.description || undefined
  const canonicalPath = slug === 'home' ? '/' : `/${slug}`
  const ogImage = seo.og_image || undefined

  return {
    metadataBase: new URL(SITE_URL),
    title: `${title} · ${SITE_NAME}`,
    description,
    alternates: { canonical: canonicalPath },
    robots: isPreview
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: seo.og_title || title,
      description: seo.og_description || description,
      url: canonicalPath,
      siteName: SITE_NAME,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: seo.og_title || title,
      description: seo.og_description || description,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}
```

- [ ] **Step 3: Verify build typechecks**

Run: `yarn build`
Expected: compiles without type errors.

- [ ] **Step 4: Commit**

```bash
git add "app/[...slug]/page.tsx"
git commit -m "feat: config-driven SEO metadata with canonical, OG fallback, preview noindex"
```

---

### Task 8: `robots.ts` + `sitemap.ts`

**Files:**
- Create: `lib/sitemap.ts`
- Create: `lib/sitemap.test.ts`
- Create: `app/robots.ts`
- Create: `app/sitemap.ts`

**Interfaces:**
- Produces: `sitemapPaths(links: Record<string, SbLink>): string[]` — public, indexable paths (excludes folders, `home` duplicate, `data/`).
- Consumes: `getAllLinks` (Task 2); `SITE_URL`, `isPreview` (Task 1); `isDataRoute` (Task 1).

- [ ] **Step 1: Write the failing test `lib/sitemap.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { sitemapPaths } from './sitemap'

describe('sitemapPaths', () => {
  it('keeps public pages, drops folders/home/data', () => {
    const links = {
      a: { slug: 'home', is_folder: false },
      b: { slug: 'about', is_folder: false },
      c: { slug: 'blog', is_folder: true },
      d: { slug: 'data/menu', is_folder: false },
      e: { slug: 'leistungen/seo', is_folder: false },
    }
    expect(sitemapPaths(links).sort()).toEqual(['/', '/about', '/leistungen/seo'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test lib/sitemap.test.ts`
Expected: FAIL — cannot find module `./sitemap`.

- [ ] **Step 3: Create `lib/sitemap.ts`**

```ts
import { isDataRoute } from './storyblok-routes'
import type { SbLink } from './storyblok-api'

export function sitemapPaths(links: Record<string, SbLink>): string[] {
  const paths: string[] = []
  for (const link of Object.values(links)) {
    if (link.is_folder || isDataRoute(link.slug)) continue
    paths.push(link.slug === 'home' ? '/' : `/${link.slug}`)
  }
  return paths
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test lib/sitemap.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Create `app/sitemap.ts`**

```ts
import type { MetadataRoute } from 'next'
import { SITE_URL } from '../lib/config'
import { getAllLinks } from '../lib/storyblok-api'
import { sitemapPaths } from '../lib/sitemap'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const links = await getAllLinks()
  return sitemapPaths(links).map(path => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified: new Date(),
  }))
}
```

- [ ] **Step 6: Create `app/robots.ts`**

```ts
import type { MetadataRoute } from 'next'
import { SITE_URL, isPreview } from '../lib/config'

export default function robots(): MetadataRoute.Robots {
  if (isPreview) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: new URL('/sitemap.xml', SITE_URL).toString(),
  }
}
```

- [ ] **Step 7: Verify build**

Run: `yarn build`
Expected: compiles; `/sitemap.xml` and `/robots.txt` appear in the route list.

- [ ] **Step 8: Commit**

```bash
git add lib/sitemap.ts lib/sitemap.test.ts app/sitemap.ts app/robots.ts
git commit -m "feat: sitemap and robots (preview disallowed, data/ excluded)"
```

---

### Task 9: Build-time redirects from `data/redirects`

Editors manage redirects in a Storyblok `data/redirects` story; `next.config` generates Next redirects at build. Convert `next.config.js` → `next.config.mjs` so it can import a testable mapper.

**Files:**
- Create: `lib/redirects.mjs`
- Create: `lib/redirects.test.ts`
- Create: `next.config.mjs`
- Delete: `next.config.js`

**Interfaces:**
- Produces: `toNextRedirects(entries)` where each entry is `{ source, destination, permanent? }` → Next redirect objects; invalid entries dropped.

- [ ] **Step 1: Write the failing test `lib/redirects.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
// @ts-expect-error - plain JS module
import { toNextRedirects } from './redirects.mjs'

describe('toNextRedirects', () => {
  it('maps valid entries and defaults to permanent', () => {
    const out = toNextRedirects([
      { source: '/alt', destination: '/neu' },
      { source: '/tmp', destination: '/ziel', permanent: false },
    ])
    expect(out).toEqual([
      { source: '/alt', destination: '/neu', permanent: true },
      { source: '/tmp', destination: '/ziel', permanent: false },
    ])
  })
  it('drops entries missing source or destination', () => {
    expect(toNextRedirects([{ source: '/x' }, { destination: '/y' }, {}])).toEqual([])
  })
  it('tolerates non-array input', () => {
    expect(toNextRedirects(undefined)).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test lib/redirects.test.ts`
Expected: FAIL — cannot find module `./redirects.mjs`.

- [ ] **Step 3: Create `lib/redirects.mjs`**

```js
import StoryblokClient from 'storyblok-js-client'

/** Map Storyblok redirect entries to Next redirect objects; drop invalid ones. */
export function toNextRedirects(entries) {
  if (!Array.isArray(entries)) return []
  return entries
    .filter(e => e && typeof e.source === 'string' && typeof e.destination === 'string')
    .map(e => ({
      source: e.source,
      destination: e.destination,
      permanent: e.permanent !== false,
    }))
}

/** Fetch the data/redirects story at build time; never throw (return []). */
export async function fetchRedirects() {
  const token = process.env.NEXT_PUBLIC_STORYBLOK_TOKEN
  if (!token) return []
  try {
    const sb = new StoryblokClient({ accessToken: token })
    const { data } = await sb.get('cdn/stories/data/redirects', { version: 'published' })
    return toNextRedirects(data?.story?.content?.entries)
  } catch {
    return []
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test lib/redirects.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Create `next.config.mjs` and delete `next.config.js`**

```js
import { fetchRedirects } from './lib/redirects.mjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.storyblok.com' }],
  },
  async redirects() {
    return fetchRedirects()
  },
}

export default nextConfig
```

```bash
git rm next.config.js
```

- [ ] **Step 6: Verify build**

Run: `yarn build`
Expected: compiles; redirects fetch resolves (returns `[]` if the story/token is absent — no crash).

- [ ] **Step 7: Commit**

```bash
git add lib/redirects.mjs lib/redirects.test.ts next.config.mjs
git commit -m "feat: build-time redirects sourced from data/redirects"
```

---

### Task 10: Not-found page

**Files:**
- Create: `app/not-found.tsx`

- [ ] **Step 1: Create `app/not-found.tsx`**

```tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="container mx-auto p-8 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2">Diese Seite wurde nicht gefunden.</p>
      <Link href="/" className="mt-4 inline-block underline">
        Zur Startseite
      </Link>
    </main>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `yarn build`
Expected: compiles; `/_not-found` in the route list.

- [ ] **Step 3: Commit**

```bash
git add app/not-found.tsx
git commit -m "feat: add not-found page"
```

---

### Task 11: Fix the scaffolder space-id + README sync section

`generate-components` hardcoded `<your-space-id>`; Task 1 already replaced the scripts with `$STORYBLOK_SPACE_ID`. Confirm `generators/cli.js` reads its argument path, and update the README to document `yarn sync` / `yarn scaffold`.

**Files:**
- Modify: `README.md`
- Verify: `generators/cli.js` accepts the components.json path as `process.argv[2]`.

- [ ] **Step 1: Verify the generator reads its path argument**

Run: `grep -n "argv" generators/cli.js`
Expected: it reads `process.argv[2]` (the components.json path). If it instead hardcodes a path, change it to `const componentsPath = process.argv[2]`.

- [ ] **Step 2: Update the README scripts section**

Replace any `pull-components` / `generate-types` / `generate-components` references with:

```markdown
## Storyblok sync

- `yarn sync` — pull component schemas from Storyblok and regenerate TS types.
- `yarn scaffold` — generate code stubs for any components missing a file
  (run deliberately; not part of `sync`). Requires `STORYBLOK_SPACE_ID` in env.
```

- [ ] **Step 3: Commit**

```bash
git add README.md generators/cli.js
git commit -m "docs: document sync/scaffold split; read space id from env"
```

---

### Task 12: Storyblok image URL helper (reusable perf util)

A pure helper that builds Storyblok image-service URLs (format/quality/size) and
reads intrinsic dimensions from the asset filename — so instance components avoid
CLS and ship modern formats.

**Files:**
- Create: `lib/storyblok-image.ts`
- Create: `lib/storyblok-image.test.ts`

**Interfaces:**
- Produces:
  - `storyblokImageDimensions(url: string): { width: number; height: number } | null` — parsed from the `.../WIDTHxHEIGHT/...` segment Storyblok puts in asset URLs.
  - `storyblokImageLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string` — a `next/image` loader producing `/m/<width>x0/filters:format(webp):quality(<q>)`.

- [ ] **Step 1: Write the failing test `lib/storyblok-image.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { storyblokImageDimensions, storyblokImageLoader } from './storyblok-image'

const url = 'https://a.storyblok.com/f/123/1600x900/abcdef/hero.jpg'

describe('storyblokImageDimensions', () => {
  it('parses width and height', () => {
    expect(storyblokImageDimensions(url)).toEqual({ width: 1600, height: 900 })
  })
  it('returns null when absent', () => {
    expect(storyblokImageDimensions('https://a.storyblok.com/x/hero.jpg')).toBeNull()
  })
})

describe('storyblokImageLoader', () => {
  it('builds a resized webp url', () => {
    expect(storyblokImageLoader({ src: url, width: 800, quality: 70 })).toBe(
      `${url}/m/800x0/filters:format(webp):quality(70)`,
    )
  })
  it('defaults quality to 75', () => {
    expect(storyblokImageLoader({ src: url, width: 400 })).toBe(
      `${url}/m/400x0/filters:format(webp):quality(75)`,
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test lib/storyblok-image.test.ts`
Expected: FAIL — cannot find module `./storyblok-image`.

- [ ] **Step 3: Create `lib/storyblok-image.ts`**

```ts
export function storyblokImageDimensions(
  url: string,
): { width: number; height: number } | null {
  const match = url.match(/\/(\d+)x(\d+)\//)
  if (!match) return null
  return { width: Number(match[1]), height: Number(match[2]) }
}

export function storyblokImageLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}): string {
  return `${src}/m/${width}x0/filters:format(webp):quality(${quality ?? 75})`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test lib/storyblok-image.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/storyblok-image.ts lib/storyblok-image.test.ts
git commit -m "feat: storyblok image url helper (dimensions + webp loader)"
```

---

### Task 13: `.claude/` assets + `CLAUDE.md` (DX, ported from frontend-desinfecta)

Port and trim the team conventions so every clone inherits them.

**Files:**
- Create: `.claude/skills/new-storyblok-component/SKILL.md`
- Create: `.claude/agents/storyblok-component-reviewer.md`
- Create: `.claude/settings.json`
- Create: `CLAUDE.md`

- [ ] **Step 1: Create `.claude/skills/new-storyblok-component/SKILL.md`**

```markdown
---
name: new-storyblok-component
description: Use when adding a new Storyblok blok (section or component) to this template — scaffolds the file, registry entry, and types so it actually renders.
---

# Add a Storyblok component

A blok renders ONLY if all wiring steps are done. A missing/mismatched registry
key fails SILENTLY (no error, just no render).

1. **File**: `components/nestables/sections/<Name>.tsx` (a `*Section`) or
   `components/nestables/components/<Name>.tsx` (a leaf `*Card`/`*Item`).
   Content types go in `components/content_types/`.
2. **Component**: PascalCase, props `{ blok: <Name>Storyblok }`, spread
   `storyblokEditable(blok)` on the root element. Map `body`/`items` with
   `StoryblokServerComponent`.
3. **Registry**: add to `lib/storyblok.ts` `components: { ... }` with the key =
   the EXACT camelCase Storyblok technical name (e.g. `heroSection`).
4. **Types**: run `yarn sync` so `<Name>Storyblok` exists; type the props with it.

Naming: technical name = camelCase role-suffixed (`heroSection`, `clientCard`);
field names follow the vocabulary in CLAUDE.md (`headline`, `text`, `body`,
`items`, `image`…). Whitelist child bloks by tag (`section`/`shared`/`richtext`),
never by enumerating.
```

- [ ] **Step 2: Create `.claude/agents/storyblok-component-reviewer.md`**

```markdown
---
name: storyblok-component-reviewer
description: Reviews a newly added/modified Storyblok blok against this template's conventions.
tools: Read, Grep, Glob
---

Check, and report any failures with file:line:

1. Registry: a `lib/storyblok.ts` entry exists; key is EXACT camelCase technical name.
2. Editable: `storyblokEditable(blok)` spread on the component root.
3. Server/client: component is a server component unless it needs interaction
   (then a minimal `'use client'` island only).
4. Types: props use the generated `<Name>Storyblok` type; no `any`.
5. Naming: PascalCase file 1:1 with technical name; correct folder
   (content_types / nestables/sections / nestables/components).
6. Field names follow the CLAUDE.md vocabulary.
7. Child whitelisting is by tag, not enumeration.
```

- [ ] **Step 3: Create `.claude/settings.json`**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "f=$(jq -r '.tool_input.file_path // empty'); case \"$f\" in *.env|*.env.*) echo 'Refusing to edit .env files' >&2; exit 2;; esac"
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "c=$(jq -r '.tool_input.command // empty'); echo \"$c\" | grep -Eq 'git +commit' && git rev-parse --abbrev-ref HEAD | grep -Eqx 'main|master' && { echo 'Refusing to commit on main; use a feature branch' >&2; exit 2; }; exit 0"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 4: Create `CLAUDE.md`**

```markdown
# next-storyblok-template

Next 16 (App Router, RSC) + Storyblok marketing-site template.

## Architecture
- **All Storyblok reads** go through `lib/storyblok-api.ts` (`server-only`). Live
  reads are cache-tagged with `STORYBLOK_CACHE_TAG`; never call the SDK directly
  from a component.
- **Revalidation**: `/api/revalidate` verifies the webhook signature and flushes
  the single `storyblok` tag. Tag-flush only works because every read is tagged.
- **Bridge** loads only in preview (`StoryblokProvider` gated on draft mode). It
  must never ship in the production bundle.
- **Globals** live under `data/` and are non-routable (rejected by the page
  loader and excluded from sitemap/static params).
- **MODE** (`preview`|`live`) gates draft content, `noindex`, and the bridge.

## Conventions
- Registry key = EXACT camelCase technical name (mismatch = silent no-render).
- Hierarchy: `page` → `*Section` → `*Card`/`*Item`. PascalCase files 1:1.
- Whitelist child bloks by tag (`section`/`shared`/`richtext`), never enumerate.
- Field-name vocabulary (rules of thumb): `headline` (heading), `eyebrow`,
  `lead`/`text` (richtext), `body`/`items` (nested bloks), `image`/`images`,
  `link`/`links`, `label`, `variant`/`theme` (options), `is*`/`has*` (booleans).

## Workflow
- `yarn sync` — pull schemas + regenerate types. Commit `components.json`.
- `yarn scaffold` — generate stubs for missing components (deliberate, separate).
- Schema source of truth = Storyblok UI; push back via the CLI/Management API
  only when authoring a blok in code (overwrites — coordinate).
- Agents: use the Storyblok Management API, not the MCP, for schema/content work.
- Never edit `.env*`; never commit on `main`.
```

- [ ] **Step 5: Commit**

```bash
git add .claude CLAUDE.md
git commit -m "docs: add storyblok conventions skill, reviewer agent, hooks, CLAUDE.md"
```

---

### Task 14: Analytics & consent primitives (Pirsch + PrivacyBee)

House-standard reusable primitives. **Pirsch** is cookieless → loads always.
**PrivacyBee** is the CMP → gates cookie-setting tags. Both env-driven; render
nothing if their env var is unset (so the template is safe with no config).

**Files:**
- Create: `lib/analytics.ts`
- Create: `lib/analytics.test.ts`
- Create: `components/analytics/Pirsch.tsx`
- Create: `components/analytics/ConsentManager.tsx`
- Modify: `app/layout.tsx`
- Modify: `.env.example`

**Interfaces:**
- Produces: `pirschAttributes(code?: string): { id: string; src: string; 'data-code': string } | null`.

- [ ] **Step 1: Write the failing test `lib/analytics.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { pirschAttributes } from './analytics'

describe('pirschAttributes', () => {
  it('returns script attributes when a code is set', () => {
    expect(pirschAttributes('ABC123')).toEqual({
      id: 'pianjs',
      src: 'https://api.pirsch.io/pa.js',
      'data-code': 'ABC123',
    })
  })
  it('returns null when no code', () => {
    expect(pirschAttributes(undefined)).toBeNull()
    expect(pirschAttributes('')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test lib/analytics.test.ts`
Expected: FAIL — cannot find module `./analytics`.

- [ ] **Step 3: Create `lib/analytics.ts`**

```ts
export function pirschAttributes(
  code?: string,
): { id: string; src: string; 'data-code': string } | null {
  if (!code) return null
  return { id: 'pianjs', src: 'https://api.pirsch.io/pa.js', 'data-code': code }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test lib/analytics.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Create `components/analytics/Pirsch.tsx`**

```tsx
import Script from 'next/script'
import { pirschAttributes } from '../../lib/analytics'

/** Cookieless analytics — safe to load without consent. */
export default function Pirsch() {
  const attrs = pirschAttributes(process.env.NEXT_PUBLIC_PIRSCH_CODE)
  if (!attrs) return null
  return <Script strategy="afterInteractive" defer {...attrs} />
}
```

- [ ] **Step 6: Create `components/analytics/ConsentManager.tsx`**

```tsx
import Script from 'next/script'

/**
 * Loads the PrivacyBee CMP, which manages consent for any cookie-setting tags
 * (GTM, ad pixels). Those tags must be registered with PrivacyBee and load only
 * after consent — never render them unconditionally here.
 *
 * VERIFY-AT-BUILD: confirm the exact PrivacyBee embed URL/attributes and the
 * consent-state API from current PrivacyBee docs before wiring gated tags.
 */
export default function ConsentManager() {
  const src = process.env.NEXT_PUBLIC_PRIVACYBEE_SRC
  if (!src) return null
  return <Script strategy="afterInteractive" src={src} />
}
```

- [ ] **Step 7: Add both to `app/layout.tsx`**

Add imports:

```tsx
import ConsentManager from '../components/analytics/ConsentManager'
import Pirsch from '../components/analytics/Pirsch'
```

Render them inside `<body>`, after `{children}`'s provider:

```tsx
      <body>
        <StoryblokProvider bridge={bridge}>{children}</StoryblokProvider>
        <Pirsch />
        <ConsentManager />
      </body>
```

- [ ] **Step 8: Append to `.env.example`**

```bash

# Analytics & consent
NEXT_PUBLIC_PIRSCH_CODE=<your-pirsch-code>
NEXT_PUBLIC_PRIVACYBEE_SRC=<privacybee-embed-src>
```

- [ ] **Step 9: Verify test + build**

Run: `yarn test lib/analytics.test.ts && yarn build`
Expected: tests pass; build compiles (both components render null without env, so no crash).

- [ ] **Step 10: Commit**

```bash
git add lib/analytics.ts lib/analytics.test.ts components/analytics app/layout.tsx .env.example
git commit -m "feat: pirsch (cookieless) + privacybee consent primitives, env-driven"
```

---

### Task 15: Full test + build gate

- [ ] **Step 1: Run the whole unit suite**

Run: `yarn test`
Expected: all tests pass (routes, api, webhook, draft, sitemap, redirects).

- [ ] **Step 2: Production build**

Run: `yarn build`
Expected: clean build; routes include `/[...slug]`, `/api/revalidate`, `/api/draft`, `/sitemap.xml`, `/robots.txt`, `/_not-found`.

- [ ] **Step 3: Confirm bridge absent from production bundle**

Run: `grep -rl "storyblok-v2-latest" .next/static 2>/dev/null; echo "exit=$?"`
Expected: no matches.

- [ ] **Step 4: Commit any lockfile/config drift**

```bash
git add -A && git commit -m "chore: template hardening verification gate" || echo "nothing to commit"
```
