import fs from 'node:fs'
import path from 'node:path'

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
