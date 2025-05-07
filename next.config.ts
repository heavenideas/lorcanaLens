import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lorcana-api.com', // Common API source for Lorcana images
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.lorcania.com', // Another common source for Lorcana images
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
