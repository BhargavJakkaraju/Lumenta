/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Increase API route body size limit for video uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '250mb',
    },
  },
}

export default nextConfig
