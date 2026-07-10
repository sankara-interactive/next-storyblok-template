import { fetchRedirects } from './lib/redirects.mjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.storyblok.com' }],
  },
  async redirects() {
    return fetchRedirects()
  },
}

export default nextConfig
