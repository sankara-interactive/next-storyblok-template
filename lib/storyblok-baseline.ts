import fs from 'node:fs'
import path from 'node:path'
import { isDataRoute } from './storyblok-routes'

export type BaselineField = {
  type: string
  component_whitelist?: string[]
  keys?: string[]
}

export type BaselineComponent = {
  name: string
  is_root?: boolean
  is_nestable?: boolean
  schema: Record<string, BaselineField>
}

const BASELINE_PATH = path.join(
  process.cwd(),
  '.storyblok/components/baseline/components.baseline.json'
)

export function loadBaseline(): BaselineComponent[] {
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'))
}

/** Blok names a component's bloks fields allow, across every field. */
export function whitelistedBloks(component: BaselineComponent): string[] {
  return Object.values(component.schema).flatMap(field => field.component_whitelist ?? [])
}

type BaselineStory = {
  full_slug: string
  is_folder?: boolean
  content?: { component?: string }
}

const STORIES_DIR = path.join(process.cwd(), '.storyblok/stories/baseline')

export function loadBaselineStories(): BaselineStory[] {
  return fs
    .readdirSync(STORIES_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => JSON.parse(fs.readFileSync(path.join(STORIES_DIR, file), 'utf8')))
}

/** Bloks reachable from a routable story, so they must render. Data-only bloks are excluded. */
export function renderableBloks(): string[] {
  const byName = new Map(loadBaseline().map(c => [c.name, c]))
  const roots = loadBaselineStories()
    .filter(story => !story.is_folder && !isDataRoute(story.full_slug))
    .map(story => story.content?.component)
    .filter((name): name is string => Boolean(name))

  const seen = new Set<string>()
  const queue = [...roots]
  while (queue.length) {
    const name = queue.shift()!
    if (seen.has(name)) continue
    seen.add(name)
    const component = byName.get(name)
    if (component) queue.push(...whitelistedBloks(component))
  }
  return [...seen]
}
