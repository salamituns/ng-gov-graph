import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from 'next/constants'

// PostHog's ingestion host for the project's region (us or eu); its static assets live on the matching -assets host.
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
const posthogAssets = posthogHost.replace('.i.posthog.com', '-assets.i.posthog.com')

export default function config(phase: string): NextConfig {
const lab = process.env.LAB_BUILD === '1'
// CI and local lab builds must never consume a dotenv database credential.
if (lab && phase === PHASE_PRODUCTION_BUILD) process.env.DATABASE_URL = ''
const nextConfig: NextConfig = {
  output: lab ? 'standalone' : undefined,
  env: { NEXT_PUBLIC_LAB_BUILD: lab ? '1' : '0' },
  // Analytics and feedback reach PostHog through our own domain, so ad blockers don't drop them.
  async rewrites() {
    if (lab) return []
    return [
      { source: '/ingest/static/:path*', destination: `${posthogAssets}/static/:path*` },
      { source: '/ingest/:path*', destination: `${posthogHost}/:path*` },
    ]
  },
  skipTrailingSlashRedirect: true,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    unoptimized: lab,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nass.gov.ng',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'en.wikipedia.org',
      },
    ],
  },
};

return nextConfig
}
