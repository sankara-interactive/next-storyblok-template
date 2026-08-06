import StoryblokClient from 'storyblok-js-client'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

/**
 * Lists assets that no story references — neither in published nor in draft
 * content. Prompts before deleting anything.
 *
 * Usage: set -a; source .env; set +a; node scripts/find-unused-assets.mjs
 * Needs STORYBLOK_SPACE_ID, STORYBLOK_OAUTH_TOKEN, STORYBLOK_PREVIEW_TOKEN.
 *
 * Blind spots: only story content is scanned. References in datasources,
 * component presets, hardcoded URLs in app code, or older story versions
 * (restorable from history) are not seen. Double-check before deleting.
 */

const space = process.env.STORYBLOK_SPACE_ID
const managementToken = process.env.STORYBLOK_OAUTH_TOKEN
const previewToken = process.env.STORYBLOK_PREVIEW_TOKEN

if (!space || !managementToken || !previewToken) {
  console.error('Missing env — source .env first (see usage in this file).')
  process.exit(1)
}

async function fetchJson(url, headers = {}) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await fetch(url, { headers })
    if (response.status === 429) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      continue
    }
    if (!response.ok) throw new Error(`${response.status} ${url}`)
    return response.json()
  }
  throw new Error(`Rate limited after retries: ${url}`)
}

async function allAssets() {
  const assets = []
  for (let page = 1; ; page++) {
    const storyblokManagement = new StoryblokClient({ oauthToken: managementToken })
    const { data } = await storyblokManagement.get(`/spaces/${space}/assets`, {
      per_page: 100,
      page,
    })
    assets.push(...data.assets)
    if (data.assets.length < 100) return assets
    await new Promise(resolve => setTimeout(resolve, 400))
  }
}

async function storyCorpus(version) {
  const chunks = []
  for (let page = 1; ; page++) {
    const storyblok = new StoryblokClient({ accessToken: previewToken })
    const { data } = await storyblok.get('/cdn/stories', {
      token: previewToken,
      version,
      per_page: 25,
      page,
    })
    chunks.push(JSON.stringify(data))
    if (data.stories.length < 25) return chunks.join('')
    await new Promise(resolve => setTimeout(resolve, 400))
  }
}

// The last three path segments (<dimensions>/<hash>/<name>) are unique per
// asset — plain filenames would collide across re-uploads.
function referenceKey(filename) {
  return filename.split('/').slice(-3).join('/')
}

const [assets, published, draft] = await Promise.all([
  allAssets(),
  storyCorpus('published'),
  storyCorpus('draft'),
])
const corpus = published + draft

const unused = assets.filter(
  asset => asset.filename && !corpus.includes(referenceKey(asset.filename))
)

const storyblokManagement = new StoryblokClient({ oauthToken: managementToken })

for (const asset of unused) {
  console.log(`${asset.id} ${asset.created_at} ${asset.filename}`)
}

console.log(`${assets.length} assets, ${unused.length} unreferenced (published + draft):\n`)

if (unused.length === 0) {
  process.exit(0)
}

const rl = createInterface({ input: stdin, output: stdout })
const answer = (await rl.question('Delete all unused assets? (yes/no)')).trim().toLowerCase()
rl.close()

if (answer !== 'yes') {
  console.log('No assets deleted.')
  process.exit(0)
}

for (const asset of unused) {
  try {
    await storyblokManagement.delete(`/spaces/${space}/assets/${asset.id}`)
    console.log(`Deleted asset ${asset.id}`)
  } catch (error) {
    console.error(`Error deleting asset ${asset.id}:`, error)
  }
}
