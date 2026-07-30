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

/**
 * The webhook signing secret is the one value you cannot know before deploying —
 * Storyblok needs a reachable URL first, and initial work happens locally. So it
 * defaults outside production and stays mandatory in it: a known default HMAC
 * secret on a real host would let anyone forge a revalidation webhook.
 */
export const webhookSecretSchema = (isProduction: boolean) =>
  z.preprocess(input => input || (isProduction ? input : 'local-dev-unsigned'), nonEmpty)

const isProduction = process.env.NODE_ENV === 'production'

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    SITE_URL: siteUrlSchema(isProduction),
    SITE_NAME: siteNameSchema(isProduction),
    MODE: z.enum(['preview', 'live']).optional(),
    VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
    // Required, not optional. Both are needed for local work — the visual editor
    // points at localhost and local dev always reads drafts — so a missing one
    // fails at boot naming itself rather than when someone hits /api/draft.
    STORYBLOK_PREVIEW_TOKEN: nonEmpty,
    API_SECRET: nonEmpty,
    STORYBLOK_WEBHOOK_SECRET: webhookSecretSchema(isProduction),
    STORYBLOK_SKIP_FETCH: z
      .enum(['true', 'false'])
      .default('false')
      .transform(input => input === 'true'),
  },
  client: {
    NEXT_PUBLIC_STORYBLOK_TOKEN: nonEmpty,
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
