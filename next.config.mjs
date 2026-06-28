import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/lib/i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'], // Google OAuth avatars
  },
  // Next.js 14 uses the experimental key; the top-level `serverExternalPackages`
  // is Next 15+ and is silently ignored here.
  experimental: {
    // Native/heavy deps loaded at runtime (require), never webpack-bundled.
    serverComponentsExternalPackages: ['pdf-parse', 'tesseract.js', 'impit'],
  },
}

export default withNextIntl(nextConfig)
