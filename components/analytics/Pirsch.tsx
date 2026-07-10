import Script from 'next/script'
import { pirschAttributes } from '@/lib/analytics'
import { env } from '@/lib/env'

/** Cookieless analytics — safe to load without consent. */
export default function Pirsch() {
  if (env.NODE_ENV === 'development') return null
  const attrs = pirschAttributes(env.NEXT_PUBLIC_PIRSCH_CODE)
  if (!attrs) return null
  return <Script strategy="afterInteractive" {...attrs} />
}
