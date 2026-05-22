import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/lib/i18n.ts')

const nextConfig: NextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'], // Google OAuth avatars
  },
}

export default withNextIntl(nextConfig)
