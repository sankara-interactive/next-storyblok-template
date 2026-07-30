import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

const nonEmpty = z.string().trim().min(1)

/** Mandatory in production, defaulted outside it. */
export const devDefault = (isProduction: boolean, fallback: string) =>
  isProduction ? nonEmpty : nonEmpty.default(fallback)

export const siteUrlSchema = (isProduction: boolean) =>
  (isProduction ? z.url() : z.url().default('http://localhost:3000'))
    .refine(input => !isProduction || new URL(input).protocol === 'https:', {
      message: 'SITE_URL must use HTTPS in production',
    })
    .transform(input => new URL(input).origin)

const isProduction = process.env.NODE_ENV === 'production'

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    SITE_URL: siteUrlSchema(isProduction),
    SITE_NAME: devDefault(isProduction, 'Site'),
    MODE: z.enum(['preview', 'live']).optional(),
    VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
    // Needed for local work: the editor points at localhost, dev reads drafts.
    STORYBLOK_PREVIEW_TOKEN: nonEmpty,
    API_SECRET: nonEmpty,
    // Unknowable before deploying, but a known HMAC secret on a real host lets
    // anyone forge a revalidation webhook.
    STORYBLOK_WEBHOOK_SECRET: devDefault(isProduction, 'local-dev-unsigned'),
    STORYBLOK_SKIP_FETCH: z.stringbool({ truthy: ['true'], falsy: ['false'] }).default(false),
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
