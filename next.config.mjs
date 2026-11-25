import createNextIntlPlugin from 'next-intl/plugin'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  // The Visual Editor frames the site, which X-Frame-Options cannot allow-list.
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://app.storyblok.com" },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.storyblok.com' }],
  },
  // Keep developer-owned pattern redirects here. CMS exact-path redirects are
  // resolved at the 404 boundary in lib/redirects.ts.
}

export default createNextIntlPlugin()(nextConfig)
