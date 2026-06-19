import Script from 'next/script'
import { pirschAttributes } from '../../lib/analytics'

/** Cookieless analytics — safe to load without consent. */
export default function Pirsch() {
  const attrs = pirschAttributes(process.env.NEXT_PUBLIC_PIRSCH_CODE)
  if (!attrs) return null
  return <Script strategy="afterInteractive" defer {...attrs} />
}
