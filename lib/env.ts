import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

const nonEmpty = z.string().trim().min(1)

export const siteUrlSchema = (isProduction: boolean) =>
  z.preprocess(
    input => input || (isProduction ? input : 'http://localhost:3000'),
    z
      .url()
      .refine(input => !isProduction || new URL(input).protocol === 'https:', {
        message: 'SITE_URL must use HTTPS in production',
      })
      .transform(input => new URL(input).origin)
  )

export const siteNameSchema = (isProduction: boolean) =>
  z.preprocess(input => input || (isProduction ? input : 'Site'), nonEmpty)

export const booleanStringSchema = z
  .enum(['true', 'false'])
  .default('false')
  .transform(input => input === 'true')

const isProduction = process.env.NODE_ENV === 'production'

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    SITE_URL: siteUrlSchema(isProduction),
    SITE_NAME: siteNameSchema(isProduction),
    MODE: z.enum(['preview', 'live']).optional(),
    VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
    STORYBLOK_PREVIEW_TOKEN: nonEmpty.optional(),
    API_SECRET: nonEmpty.optional(),
    STORYBLOK_WEBHOOK_SECRET: nonEmpty.optional(),
    STORYBLOK_SKIP_FETCH: booleanStringSchema,
  },
  client: {
    NEXT_PUBLIC_STORYBLOK_TOKEN: nonEmpty.optional(),
    NEXT_PUBLIC_PIRSCH_CODE: nonEmpty.optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    SITE_URL: process.env.SITE_URL,
    SITE_NAME: process.env.SITE_NAME,
    // Vite/Vitest reserves MODE for its own `test` value.
    MODE: process.env.MODE === 'test' ? undefined : process.env.MODE,
    VERCEL_ENV: process.env.VERCEL_ENV,
    STORYBLOK_PREVIEW_TOKEN: process.env.STORYBLOK_PREVIEW_TOKEN,
    API_SECRET: process.env.API_SECRET,
    STORYBLOK_WEBHOOK_SECRET: process.env.STORYBLOK_WEBHOOK_SECRET,
    STORYBLOK_SKIP_FETCH: process.env.STORYBLOK_SKIP_FETCH,
    NEXT_PUBLIC_STORYBLOK_TOKEN: process.env.NEXT_PUBLIC_STORYBLOK_TOKEN,
    NEXT_PUBLIC_PIRSCH_CODE: process.env.NEXT_PUBLIC_PIRSCH_CODE,
  },
  emptyStringAsUndefined: true,
})

export function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export function resolveDeliveryToken(
  nodeEnv: 'development' | 'test' | 'production',
  token: string | undefined
): string | undefined {
  if (nodeEnv === 'test') return token ?? 'test-token'
  if (nodeEnv === 'production') return requireEnv('NEXT_PUBLIC_STORYBLOK_TOKEN', token)
  return token
}

export const readDeliveryToken = () =>
  resolveDeliveryToken(env.NODE_ENV, env.NEXT_PUBLIC_STORYBLOK_TOKEN)

export const isContentFetchDisabled = () => env.STORYBLOK_SKIP_FETCH
