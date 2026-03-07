const withSerwist = require('@serwist/next').default({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['sharp'],
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '**/*',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '**/*',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '**/*',
      },
      {
        protocol: 'https',
        hostname: 'ketxnamtpbvfvblowfoo.supabase.co',
        pathname: '**/*',
      },
    ],
    dangerouslyAllowSVG: true,
  },
};

// Only wrap with Serwist in production to avoid Turbopack/webpack conflicts in dev
module.exports = process.env.NODE_ENV === 'production' ? withSerwist(nextConfig) : nextConfig;
