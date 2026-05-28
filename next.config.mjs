import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/lib/i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'], // Google OAuth avatars
  },
  serverExternalPackages: ['pdf-parse', 'tesseract.js'],
}

export default withNextIntl(nextConfig)
