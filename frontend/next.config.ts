/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Allow cross-origin for leaflet tiles
  images: {
    domains: ['tile.openstreetmap.org'],
  },
};

module.exports = nextConfig;
