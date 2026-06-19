import Script from 'next/script'

/**
 * Loads the PrivacyBee CMP, which manages consent for any cookie-setting tags
 * (GTM, ad pixels). Those tags must be registered with PrivacyBee and load only
 * after consent — never render them unconditionally here.
 *
 * VERIFY-AT-BUILD: confirm the exact PrivacyBee embed URL/attributes and the
 * consent-state API from current PrivacyBee docs before wiring gated tags.
 */
export default function ConsentManager() {
  const src = process.env.NEXT_PUBLIC_PRIVACYBEE_SRC
  if (!src) return null
  return <Script strategy="afterInteractive" src={src} />
}
