import createNextIntlPlugin from 'next-intl/plugin'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.storyblok.com' }],
  },
  // Keep developer-owned pattern redirects here. CMS exact-path redirects are
  // resolved at the 404 boundary in lib/redirects.ts.
}

export default createNextIntlPlugin()(nextConfig)
