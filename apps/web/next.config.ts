import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { fileURLToPath } from 'node:url';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/commerce-flow-products/**',
      },
    ],
  },
  turbopack: {
    root: fileURLToPath(new URL('../..', import.meta.url)),
  },
};

export default withNextIntl(nextConfig);
