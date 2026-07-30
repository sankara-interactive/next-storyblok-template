/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.storyblok.com' }],
  },
  // Pattern redirects (`:slug*`) belong here, as a normal Next `redirects()`.
  // Exact-path retirement is editor-owned and resolved at the 404 boundary
  // instead — see lib/redirects.ts.
}

export default nextConfig
