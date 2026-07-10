type Environment = Record<string, string | undefined>

const value = (env: Environment, name: string) => env[name]?.trim() || undefined

export function requireEnv(name: string, env: Environment = process.env): string {
  const result = value(env, name)
  if (!result) throw new Error(`Missing required environment variable: ${name}`)
  return result
}

export function readSiteEnv(env: Environment = process.env) {
  const isTest = env.VITEST === 'true' || env.NODE_ENV === 'test'
  const isProduction = env.NODE_ENV === 'production' && !isTest
  const siteUrl = value(env, 'SITE_URL') ?? (isProduction ? undefined : 'http://localhost:3000')
  const siteName = value(env, 'SITE_NAME') ?? (isProduction ? undefined : 'Site')

  if (!siteUrl) throw new Error('Missing required environment variable: SITE_URL')
  if (!siteName) throw new Error('Missing required environment variable: SITE_NAME')

  let url: URL
  try {
    url = new URL(siteUrl)
  } catch {
    throw new Error('SITE_URL must be an absolute URL')
  }

  if (isProduction && url.protocol !== 'https:') {
    throw new Error('SITE_URL must use HTTPS in production')
  }

  return { siteUrl: url.origin, siteName }
}

export function readDeliveryToken(env: Environment = process.env): string | undefined {
  if (env.VITEST === 'true' || env.NODE_ENV === 'test') {
    return value(env, 'NEXT_PUBLIC_STORYBLOK_TOKEN') ?? 'test-token'
  }
  if (env.NODE_ENV === 'production') return requireEnv('NEXT_PUBLIC_STORYBLOK_TOKEN', env)
  return value(env, 'NEXT_PUBLIC_STORYBLOK_TOKEN')
}

export function isContentFetchDisabled(env: Environment = process.env): boolean {
  return env.STORYBLOK_SKIP_FETCH === 'true'
}
