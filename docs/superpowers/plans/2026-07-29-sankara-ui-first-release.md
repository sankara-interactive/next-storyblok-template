# `@sankara/ui` First Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `@sankara/ui@0.1.0` to public npm with a token contract, a component workbench, a release pipeline, and the two Tier 1 components (`Icon`, `Carousel`), consumable by a Next 16 + Tailwind v4 project.

**Architecture:** A plain `tsc`-compiled React component library — no bundler. Components ship Tailwind utility classes resolved against `@theme` variables the package provides as defaults and the consumer overrides. Interactive components carry `'use client'`; everything else stays a server component. Logic that can break is extracted into pure functions so it can be unit-tested without a DOM.

**Tech Stack:** TypeScript 5.9, React 19, Tailwind CSS v4 (peer), Base UI (later tiers only), Vitest + Testing Library, Storybook, Changesets, Yarn 4.7.0, Node 22.14.0.

## Global Constraints

- Package name: `@sankara/ui`. Repository: `sankara-interactive/sankara-ui`.
- Node `22.14.0`, `packageManager: yarn@4.7.0` — matched to `next-storyblok-template`.
- Build is `tsc` only. No bundler. Verified: `tsc` emits `'use client';` as line 1, above its injected jsx-runtime import.
- `'use client'` only on components that need interactivity. A blanket directive would push every consumer's tree client-side.
- No Storyblok packages, no generated CMS types, no data fetching anywhere in `src/`.
- The package never imports a FontAwesome **icon set** from shipped code. Three of five surveyed projects use FA Pro or a Kit from a licensed private registry, which a public package cannot depend on. Consumers pass `IconDefinition` values in. Test files (`src/**/*.test.*`) may import `@fortawesome/free-solid-svg-icons` as a devDependency — they are excluded from the build and never published.
- Peer dependency ranges must be permissive — surveyed projects span `@fortawesome/fontawesome-svg-core` ^6.7.2–^7.3.1 and `@fortawesome/react-fontawesome` ^0.2.0–^3.5.0.
- **`next` is not a dependency of 0.1.0.** The spec listed it as a peer because it assumed the carousel would render images itself; it takes children instead, so nothing in this release imports `next/image` or `next/link`. Add the peer in the release that introduces an image-bearing component, not before — an unused peer makes every consumer satisfy a dependency the package never loads.
- Every component accepts `className`, merged **last** so consumers always win.
- Every exported token carries a default, so an unconfigured consumer renders something plain rather than broken.
- Stay on `0.x` until the template consumes the package end to end.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `package.json` | Package metadata, exports map, peer deps, scripts |
| `tsconfig.json` | Compiler config; `declaration: true`, `outDir: dist` |
| `src/index.ts` | Public barrel — the only entry consumers import from |
| `src/styles/tokens.css` | `@theme` defaults; the token contract |
| `src/styles/tokens.ts` | `TOKENS` array — the contract as data, for the drift test |
| `src/components/Icon.tsx` | FontAwesome wrapper, server component |
| `src/components/Carousel.tsx` | Scroll-snap carousel, client component |
| `src/utilities/carousel.ts` | `slideIndexFromScroll` — pure, DOM-free |
| `src/utilities/cn.ts` | Class merge helper; consumer `className` wins |
| `scripts/check-directives.mjs` | Fails the build if a `'use client'` is lost |
| `.github/workflows/ci.yml` | Typecheck, test, build on every PR |
| `.github/workflows/release.yml` | Changesets publish with npm provenance |

---

## Task 1: Repository bootstrap and build pipeline

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- Create: `src/index.ts`, `src/utilities/cn.ts`, `src/utilities/cn.test.ts`
- Create: `scripts/check-directives.mjs`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: nothing.
- Produces: `cn(...classes: Array<string | false | null | undefined>): string`; a `yarn build` producing `dist/` with `.js` + `.d.ts`; `yarn check` running typecheck, tests and the directive guard.

- [ ] **Step 1: Create the repository**

Requires a human — this is an outward-facing action. Confirm the name and visibility first, then:

```bash
gh repo create sankara-interactive/sankara-ui --public --clone
cd sankara-ui
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "@sankara/ui",
  "version": "0.0.0",
  "description": "Shared UI components for sankara:interactive projects",
  "license": "MIT",
  "repository": { "type": "git", "url": "git+https://github.com/sankara-interactive/sankara-ui.git" },
  "type": "module",
  "sideEffects": ["*.css"],
  "files": ["dist", "src/styles"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./styles.css": "./src/styles/tokens.css"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json && node scripts/check-directives.mjs",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "check": "yarn typecheck && yarn test && yarn build"
  },
  "peerDependencies": {
    "@fortawesome/fontawesome-svg-core": "^6.7.0 || ^7.0.0",
    "@fortawesome/react-fontawesome": "^0.2.0 || ^3.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0"
  },
  "devDependencies": {
    "@fortawesome/fontawesome-svg-core": "^7.3.1",
    "@fortawesome/free-solid-svg-icons": "^7.3.1",
    "@fortawesome/react-fontawesome": "^3.5.0",
    "@testing-library/dom": "^10.4.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.13.13",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "jsdom": "^25.0.1",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "tailwindcss": "^4.2.1",
    "typescript": "^5.9.3",
    "vitest": "^3.0.0"
  },
  "engines": { "node": "^22.14.0" },
  "packageManager": "yarn@4.7.0"
}
```

- [ ] **Step 3: Write `tsconfig.json` and `tsconfig.build.json`**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "jsx": "react-jsx",
    "strict": true,
    "declaration": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "noUncheckedIndexedAccess": true,
    "outDir": "dist"
  },
  "include": ["src", "scripts", "vitest.config.ts"]
}
```

`tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "include": ["src"],
  "exclude": ["**/*.test.ts", "**/*.test.tsx", "**/*.stories.tsx", "src/test/**"]
}
```

`nodenext` resolution is load-bearing: with `"type": "module"` and no bundler,
`tsc` does not rewrite relative specifiers on emit, so every relative import in
`src/` needs an explicit `.js` extension or the published `dist/index.js` throws
`ERR_MODULE_NOT_FOUND` under plain Node. `src/test/**` must be excluded from the
build or the test harness ships inside the package.

- [ ] **Step 4: Write `vitest.config.ts` and `.gitignore`**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

`.gitignore`:

```text
node_modules
dist
.yarn
*.tsbuildinfo
storybook-static
```

- [ ] **Step 5: Write the failing test for `cn`**

`src/utilities/cn.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { cn } from './cn.js'

describe('cn', () => {
  it('joins truthy classes', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy values', () => {
    expect(cn('a', false, null, undefined, '')).toBe('a')
  })

  it('puts the consumer class last so it wins', () => {
    expect(cn('rounded-card', 'rounded-none')).toBe('rounded-card rounded-none')
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `yarn vitest run src/utilities/cn.test.ts`
Expected: FAIL — cannot resolve `./cn`.

- [ ] **Step 7: Implement `cn`**

`src/utilities/cn.ts`:

```ts
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
```

Deliberately not `tailwind-merge`: the package emits its own classes and appends the consumer's last, so later-wins ordering is enough. Revisit only if a real conflict appears.

- [ ] **Step 8: Run the test to verify it passes**

Run: `yarn vitest run src/utilities/cn.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 9: Write the directive guard**

`scripts/check-directives.mjs`:

```js
import fs from 'node:fs'
import path from 'node:path'

const read = dir =>
  fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.join(entry.parentPath, entry.name))

const sources = read('src').filter(file => /\.tsx?$/.test(file) && !/\.(test|stories)\./.test(file))
const missing = []
let declaring = 0

for (const source of sources) {
  if (!/^['"]use client['"]/.test(fs.readFileSync(source, 'utf8'))) continue
  declaring += 1
  const emitted = path
    .join('dist', path.relative('src', source))
    .replace(/\.tsx?$/, '.js')
  if (!fs.existsSync(emitted)) {
    missing.push(`${emitted} (not emitted)`)
    continue
  }
  if (!/^['"]use client['"]/.test(fs.readFileSync(emitted, 'utf8'))) {
    missing.push(`${emitted} (directive lost)`)
  }
}

if (missing.length > 0) {
  console.error(`'use client' not preserved in:\n${missing.map(m => `  ${m}`).join('\n')}`)
  process.exit(1)
}

console.log(`'use client' preserved in all ${declaring} source files that declare it.`)
```

This guards the single failure mode that would break every consumer at once, silently.

- [ ] **Step 10: Write `src/index.ts` and build**

`src/index.ts`:

```ts
export { cn } from './utilities/cn.js'
```

Run: `yarn install && yarn build`
Expected: `dist/index.js`, `dist/index.d.ts` exist; guard prints `preserved in all 0 source files that declare it.`

- [ ] **Step 11: Write CI**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  check:
    name: Check
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22.14.0
          cache: yarn
      - run: corepack enable
      - run: yarn install --immutable
      - run: yarn check
```

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: bootstrap package with tsc build and directive guard"
```

---

## Task 2: Token contract

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/tokens.ts`, `src/styles/tokens.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `TOKENS: readonly string[]` — the contract as data. Components use the Tailwind utilities these variables generate (`bg-surface`, `rounded-card`, `shadow-raised`, `text-on-surface`, `text-muted`, `bg-primary`, `text-primary-contrast`).

- [ ] **Step 1: Write the failing test**

`src/styles/tokens.test.ts`:

The `@vitest-environment node` docblock is required. The suite defaults to
jsdom for component tests, and under jsdom `import.meta.url` resolves to an
`http://localhost/` URL, so `fs.readFileSync(new URL(...))` throws
`TypeError: The URL must be of scheme file`. Override per file rather than
changing the global environment — Tasks 3 and 4 need jsdom and the jest-dom
matchers.

```ts
// @vitest-environment node
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TOKENS } from './tokens.js'

const css = fs.readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

describe('token contract', () => {
  it('declares a default for every documented token', () => {
    const missing = TOKENS.filter(token => !css.includes(`${token}:`))
    expect(missing).toEqual([])
  })

  it('declares the defaults inside an @theme block', () => {
    expect(css).toMatch(/@theme\s*\{/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn vitest run src/styles/tokens.test.ts`
Expected: FAIL — cannot resolve `./tokens`.

- [ ] **Step 3: Write the contract**

`src/styles/tokens.ts`:

```ts
/** Every @theme variable the package's components rely on. */
export const TOKENS = [
  '--color-primary',
  '--color-primary-contrast',
  '--color-surface',
  '--color-on-surface',
  '--color-muted',
  '--radius-card',
  '--shadow-raised',
] as const
```

`src/styles/tokens.css`:

```css
@theme {
  --color-primary: oklch(0.55 0.22 275);
  --color-primary-contrast: oklch(1 0 0);
  --color-surface: oklch(1 0 0);
  --color-on-surface: oklch(0.25 0.02 275);
  --color-muted: oklch(0.55 0.02 275);
  --radius-card: 1.125rem;
  --shadow-raised: 0 16px 40px rgb(0 0 0 / 0.18);
}
```

Neutral defaults on purpose — a consumer who forgets to theme gets something plain, not numbers.ch's purple.

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn vitest run src/styles/tokens.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Export the contract**

`src/index.ts`:

```ts
export { cn } from './utilities/cn.js'
export { TOKENS } from './styles/tokens.js'
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add the @theme token contract with neutral defaults"
```

---

## Task 3: Icon

**Files:**
- Create: `src/components/Icon.tsx`, `src/components/Icon.test.tsx`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `cn` from Task 1.
- Produces: `Icon({ icon, size, className, label }: IconProps)` where `IconProps = { icon: IconProp; size?: number; className?: string; label?: string }`. `IconProp` comes from `@fortawesome/fontawesome-svg-core`.

This is a **server component** — no `'use client'`. It renders no interactivity.

The accessible name is `label`, rendered as `aria-label` plus `role="img"` — **not**
FontAwesome's `title` prop. FontAwesome 7 deprecated `title`/`titleId`
(`react-fontawesome/dist/index.d.ts:365`: "Instead of using a `title` prop, use the
`aria-label` attribute instead") and it no longer reaches the DOM, so
`getByTitle` can never match. `aria-label` is a plain SVG attribute and works
across the whole `^6.7.0 || ^7.0.0` peer range, which matters because the
surveyed consumers straddle both majors.

- [ ] **Step 1: Write the failing test**

`src/components/Icon.test.tsx`:

```tsx
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Icon } from './Icon.js'

describe('Icon', () => {
  it('renders the supplied icon as an svg', () => {
    const { container } = render(<Icon icon={faChevronDown} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('exposes an accessible name when given a label', () => {
    render(<Icon icon={faChevronDown} label="Mehr anzeigen" />)
    expect(screen.getByRole('img', { name: 'Mehr anzeigen' })).toBeInTheDocument()
  })

  it('is hidden from assistive tech when it has no label', () => {
    const { container } = render(<Icon icon={faChevronDown} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('applies the consumer className last', () => {
    const { container } = render(<Icon icon={faChevronDown} className="text-muted" />)
    expect(container.querySelector('svg')?.getAttribute('class')).toMatch(/text-muted$/)
  })

  it('sets an explicit pixel size when asked', () => {
    const { container } = render(<Icon icon={faChevronDown} size={22} />)
    expect(container.querySelector('svg')).toHaveStyle({ width: '22px', height: '22px' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn vitest run src/components/Icon.test.tsx`
Expected: FAIL — cannot resolve `./Icon`.

- [ ] **Step 3: Implement `Icon`**

`src/components/Icon.tsx`:

```tsx
import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { cn } from '../utilities/cn.js'

export type IconProps = {
  /** An IconDefinition from whichever FontAwesome package the consumer installs. */
  icon: IconProp
  /** Explicit pixel size. Omit to inherit the surrounding font size. */
  size?: number
  /** Accessible name. Omit for purely decorative icons. */
  label?: string
  className?: string
}

export function Icon({ icon, size, label, className }: IconProps) {
  return (
    <FontAwesomeIcon
      icon={icon}
      // Inert under FA7 — its core bakes role="img" in and react-fontawesome
      // drops a falsy override — but kept deliberately: FA6 is inside the peer
      // range and has not been verified to do the same. aria-hidden is what
      // actually hides decorative icons, and it does work on both.
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={size ? { width: size, height: size } : undefined}
      className={cn('inline-block shrink-0', className)}
    />
  )
}
```

The package imports **no icon set** — only the two free, public FontAwesome runtime packages. Consumers on Pro or a Kit pass their own definitions in.

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn vitest run src/components/Icon.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Export and verify the server boundary**

`src/index.ts`:

```ts
export { cn } from './utilities/cn.js'
export { TOKENS } from './styles/tokens.js'
export { Icon, type IconProps } from './components/Icon.js'
```

Run: `yarn build`
Expected: guard reports 0 files declaring `'use client'` — `Icon` must not have become a client component.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Icon as a FontAwesome wrapper with no icon-set dependency"
```

---

## Task 4: Carousel

**Files:**
- Create: `src/utilities/carousel.ts`, `src/utilities/carousel.test.ts`
- Create: `src/components/Carousel.tsx`, `src/components/Carousel.test.tsx`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `cn` from Task 1; the `--radius-card` and `--color-primary` tokens from Task 2.
- Produces: `slideIndexFromScroll(scrollLeft: number, slideWidth: number, gap: number): number`; `Carousel({ children, label, perView, gap, className }: CarouselProps)`.

Scope: static scroll-snap only. Autoplay, loop and synced carousels — the Splide features fairmed.ch-sb and nuwa.swiss actually use — are **out of this release**; they arrive as a separate opt-in entry point when one of those projects migrates.

- [ ] **Step 1: Write the failing test for the index maths**

`src/utilities/carousel.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { slideIndexFromScroll } from './carousel.js'

describe('slideIndexFromScroll', () => {
  it('is zero at rest', () => {
    expect(slideIndexFromScroll(0, 300, 16)).toBe(0)
  })

  it('advances once past a full slide plus gap', () => {
    expect(slideIndexFromScroll(316, 300, 16)).toBe(1)
  })

  it('rounds to the nearest slide mid-drag', () => {
    expect(slideIndexFromScroll(200, 300, 16)).toBe(1)
    expect(slideIndexFromScroll(120, 300, 16)).toBe(0)
  })

  it('never returns a negative index for elastic overscroll', () => {
    expect(slideIndexFromScroll(-40, 300, 16)).toBe(0)
  })

  it('returns zero rather than NaN before layout settles', () => {
    expect(slideIndexFromScroll(0, 0, 16)).toBe(0)
  })
})
```

The last two cases are why this is a pure function: both are trivial here and painful to reproduce through jsdom, which does not implement scrolling.

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn vitest run src/utilities/carousel.test.ts`
Expected: FAIL — cannot resolve `./carousel`.

- [ ] **Step 3: Implement the index maths**

`src/utilities/carousel.ts`:

```ts
/** Nearest slide index for a scroll offset. Returns 0 before layout settles. */
export function slideIndexFromScroll(scrollLeft: number, slideWidth: number, gap: number): number {
  const stride = slideWidth + gap
  if (stride <= 0) return 0
  return Math.max(0, Math.round(scrollLeft / stride))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn vitest run src/utilities/carousel.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Write the failing component test**

`src/components/Carousel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Carousel } from './Carousel.js'

const slides = [<p key="a">One</p>, <p key="b">Two</p>, <p key="c">Three</p>]

describe('Carousel', () => {
  it('labels itself as a carousel for assistive tech', () => {
    render(<Carousel label="Referenzen">{slides}</Carousel>)
    const region = screen.getByRole('group', { name: 'Referenzen' })
    expect(region).toHaveAttribute('aria-roledescription', 'carousel')
  })

  it('renders every slide with a position label', () => {
    render(<Carousel label="Referenzen">{slides}</Carousel>)
    expect(screen.getByLabelText('1 von 3')).toBeInTheDocument()
    expect(screen.getByLabelText('3 von 3')).toBeInTheDocument()
  })

  it('renders one pagination dot per slide', () => {
    render(<Carousel label="Referenzen">{slides}</Carousel>)
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('marks the current dot as selected', () => {
    render(<Carousel label="Referenzen">{slides}</Carousel>)
    expect(screen.getAllByRole('button')[0]).toHaveAttribute('aria-current', 'true')
    expect(screen.getAllByRole('button')[1]).toHaveAttribute('aria-current', 'false')
  })

  it('scrolls to a slide when its dot is activated', async () => {
    const scrollTo = vi.fn()
    Element.prototype.scrollTo = scrollTo
    render(<Carousel label="Referenzen">{slides}</Carousel>)
    await userEvent.click(screen.getAllByRole('button')[2]!)
    expect(scrollTo).toHaveBeenCalled()
  })

  it('moves between slides with the arrow keys', async () => {
    const scrollTo = vi.fn()
    Element.prototype.scrollTo = scrollTo
    render(<Carousel label="Referenzen">{slides}</Carousel>)
    await userEvent.click(screen.getAllByRole('button')[0]!)
    scrollTo.mockClear()
    await userEvent.keyboard('{ArrowRight}')
    expect(scrollTo).toHaveBeenCalled()
  })

  it('applies the consumer className last', () => {
    const { container } = render(
      <Carousel label="Referenzen" className="mt-12">
        {slides}
      </Carousel>
    )
    expect(container.firstElementChild?.getAttribute('class')).toMatch(/mt-12$/)
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `yarn vitest run src/components/Carousel.test.tsx`
Expected: FAIL — cannot resolve `./Carousel`.

- [ ] **Step 7: Implement `Carousel`**

`src/components/Carousel.tsx`:

```tsx
'use client'

import { Children, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../utilities/cn.js'
import { slideIndexFromScroll } from '../utilities/carousel.js'

export type CarouselProps = {
  children: ReactNode
  /** Accessible name for the carousel as a whole. Required. */
  label: string
  /** Slides visible at once. Fractional values peek the next slide. */
  perView?: number
  /** Gap between slides, in pixels. */
  gap?: number
  className?: string
}

export function Carousel({ children, label, perView = 1, gap = 16, className }: CarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const slides = Children.toArray(children)

  const goTo = (target: number) => {
    const track = trackRef.current
    const slide = track?.children[target] as HTMLElement | undefined
    if (!track || !slide) return
    track.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' })
    setIndex(target)
  }

  const onScroll = () => {
    const track = trackRef.current
    if (!track) return
    const first = track.children[0] as HTMLElement | undefined
    setIndex(slideIndexFromScroll(track.scrollLeft, first?.offsetWidth ?? 0, gap))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      goTo(Math.min(index + 1, slides.length - 1))
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goTo(Math.max(index - 1, 0))
    }
  }

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('flex flex-col gap-6', className)}
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ gap }}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} von ${slides.length}`}
            className="shrink-0 snap-start"
            style={{ flexBasis: `calc((100% - ${(perView - 1) * gap}px) / ${perView})` }}
          >
            {slide}
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            aria-current={i === index}
            className={cn(
              'h-2.5 rounded-card transition-all',
              i === index ? 'w-8 bg-primary' : 'w-2.5 bg-muted'
            )}
          />
        ))}
      </div>
    </div>
  )
}
```

Keyboard navigation and `aria-roledescription` are the gap in all three hand-rolled versions surveyed. `scrollbar-width` is inlined rather than depending on a consumer `.no-scrollbar` utility.

- [ ] **Step 8: Run the test to verify it passes**

Run: `yarn vitest run src/components/Carousel.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 9: Export and verify the client boundary**

`src/index.ts`:

```ts
export { cn } from './utilities/cn.js'
export { TOKENS } from './styles/tokens.js'
export { Icon, type IconProps } from './components/Icon.js'
export { Carousel, type CarouselProps } from './components/Carousel.js'
export { slideIndexFromScroll } from './utilities/carousel.js'
```

Run: `yarn build`
Expected: guard reports `'use client' preserved in all 1 source files that declare it.`

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add scroll-snap Carousel with keyboard and ARIA support"
```

---

## Task 5: Storybook workbench

**Files:**
- Create: `.storybook/main.ts`, `.storybook/preview.ts`, `.storybook/preview.css`
- Create: `src/components/Icon.stories.tsx`, `src/components/Carousel.stories.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: `Icon` and `Carousel`.
- Produces: `yarn storybook` (dev) and `yarn build-storybook` (static).

- [ ] **Step 1: Install Storybook**

```bash
yarn dlx storybook@latest init --builder vite --yes
yarn add -D @storybook/addon-a11y
```

Storybook's initialiser writes its own config; the next steps replace the generated files with these.

- [ ] **Step 2: Configure Storybook**

`.storybook/main.ts`:

```ts
import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
}

export default config
```

`.storybook/preview.css`:

```css
@import "tailwindcss";
@import "../src/styles/tokens.css";
@source "../src";
```

This mirrors exactly what a consumer writes, so a missing `@source` shows up in the workbench rather than in a client project.

`.storybook/preview.ts`:

```ts
import type { Preview } from '@storybook/react'
import './preview.css'

const preview: Preview = {
  parameters: { a11y: { test: 'error' } },
}

export default preview
```

- [ ] **Step 3: Write the stories**

`src/components/Icon.stories.tsx`:

```tsx
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import type { Meta, StoryObj } from '@storybook/react'
import { Icon } from './Icon.js'

const meta: Meta<typeof Icon> = { component: Icon, title: 'Icon' }
export default meta

export const Decorative: StoryObj<typeof Icon> = {
  args: { icon: faChevronDown, size: 22 },
}

export const Labelled: StoryObj<typeof Icon> = {
  args: { icon: faChevronDown, size: 22, title: 'Mehr anzeigen' },
}
```

`src/components/Carousel.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Carousel } from './Carousel.js'

const meta: Meta<typeof Carousel> = { component: Carousel, title: 'Carousel' }
export default meta

const Slide = ({ n }: { n: number }) => (
  <div className="flex aspect-[4/3] items-center justify-center rounded-card bg-surface text-on-surface shadow-raised">
    Slide {n}
  </div>
)

export const Single: StoryObj<typeof Carousel> = {
  args: {
    label: 'Referenzen',
    children: [1, 2, 3].map(n => <Slide key={n} n={n} />),
  },
}

export const Peeking: StoryObj<typeof Carousel> = {
  args: {
    label: 'Referenzen',
    perView: 2.2,
    children: [1, 2, 3, 4, 5].map(n => <Slide key={n} n={n} />),
  },
}
```

- [ ] **Step 4: Verify the workbench renders themed components**

Run: `yarn storybook`
Expected: both stories render; `Carousel` dots are the token purple-blue, slides use `--radius-card`; the a11y addon reports no violations on either story.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Storybook workbench with the a11y addon"
```

---

## Task 6: Release pipeline and first publish

**Files:**
- Create: `.changeset/config.json`, `.github/workflows/release.yml`, `README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: everything above.
- Produces: `@sankara/ui@0.1.0` on public npm.

- [ ] **Step 1: Verify the npm scope is available**

Requires a human — `@sankara/ui` returning 404 proves the package does not exist, not that the scope is unclaimed.

```bash
npm login
npm org create sankara   # or: npm access ls-packages @sankara
```

If the scope is taken, stop and choose another before continuing; the name is baked into every consumer import.

- [ ] **Step 2: Add Changesets**

```bash
yarn add -D @changesets/cli
yarn changeset init
```

`.changeset/config.json`:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

- [ ] **Step 3: Add the release workflow**

`.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency: release-${{ github.ref }}

permissions:
  contents: write
  pull-requests: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22.14.0
          cache: yarn
          registry-url: https://registry.npmjs.org
      - run: corepack enable
      - run: yarn install --immutable
      - run: yarn check
      - uses: changesets/action@v1
        with:
          publish: yarn changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_CONFIG_PROVENANCE: 'true'
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

`id-token: write` is required for npm provenance. Add `NPM_TOKEN` to the repository secrets — a human step.

- [ ] **Step 4: Write the README**

`README.md` must lead with installation, because a missing `@source` line renders every component unstyled with no error:

````markdown
# @sankara/ui

Shared UI components for sankara:interactive projects. Next 16 + Tailwind v4.

## Install

```sh
yarn add @sankara/ui
```

Then in your global stylesheet — **both lines are required**:

```css
@import "tailwindcss";
@import "@sankara/ui/styles.css";
@source "../node_modules/@sankara/ui";
```

Tailwind v4 does not scan `node_modules` by default. Without the `@source`
line the components render completely unstyled, with no error.

## Theming

`@sankara/ui/styles.css` ships neutral defaults for every token. Override any
of them in your own `@theme` block, after the import:

| Token | Purpose |
| --- | --- |
| `--color-primary` | Accent — active carousel dot, emphasis |
| `--color-primary-contrast` | Foreground on `--color-primary` |
| `--color-surface` | Card and panel background |
| `--color-on-surface` | Body text on `--color-surface` |
| `--color-muted` | Secondary text, inactive controls |
| `--radius-card` | Corner radius for cards and panels |
| `--shadow-raised` | Elevation for raised surfaces |

## Icons

`Icon` takes a FontAwesome `IconDefinition`. The package deliberately ships no
icon set, so it works with the free packages, Pro, or a Kit:

```tsx
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { Icon } from '@sankara/ui'

<Icon icon={faChevronDown} size={22} label="Mehr anzeigen" />
```

Omit `label` for decorative icons; they are then hidden from assistive tech.
`label` becomes `aria-label` plus `role="img"` — FontAwesome 7 deprecated its own
`title` prop in favour of exactly this.

## Carousel

```tsx
import { Carousel } from '@sankara/ui'

<Carousel label="Referenzen" perView={2.2}>
  {items.map(item => <Card key={item.id} {...item} />)}
</Carousel>
```

Static scroll-snap only. Autoplay, looping and synced carousels are not
included yet.
````

- [ ] **Step 5: Publish 0.1.0**

```bash
yarn changeset            # choose minor, describe the initial release
git add -A && git commit -m "chore: release 0.1.0"
git push
```

Expected: the Changesets action opens a release PR; merging it publishes `@sankara/ui@0.1.0`.

- [ ] **Step 6: Prove a real consumer works**

This is the plan's success criterion, and it must be run against the published package, not a local link — local linking hides missing `files` entries and broken exports maps.

```bash
cd ../next-storyblok-template
yarn add @sankara/ui
```

Add to `styles/globals.css`:

```css
@import "@sankara/ui/styles.css";
@source "../node_modules/@sankara/ui";
```

Render a `Carousel` with three slides on a page, run `yarn dev`, and confirm: slides snap, dots track scrolling, arrow keys move between slides, and the dots pick up the template's `--color-primary` if it overrides the default.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "docs: document installation, theming and the Tier 1 components"
```

---

## Out of Scope

Deferred to later plans, each with its own success criterion:

- **Tier 2** — Disclosure, form primitives, Dialog, Popover, Menu (all on Base UI).
- **Tier 3** — Typography, Container, Button, Link, and the navigation set.
- **Autoplay/loop/sync carousel** — a separate opt-in entry point, built when fairmed.ch-sb or nuwa.swiss migrates and brings the real requirement.
- **Visual regression** — sequenced after this release, per the spec.
- **numbers.ch migration**, including deleting its `icon-data.ts`.
