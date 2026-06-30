const { withSentryConfig } = require('@sentry/nextjs');
const withSerwist = require('@serwist/next').default({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Keep Prisma external so its dynamically-loaded query engine is traced into
  // the standalone bundle (it's also copied explicitly in the Dockerfile).
  serverExternalPackages: ['sharp', '@prisma/client'],
  eslint: {
    // Lint errors fail the build. Warnings (any, <img>, import order, etc.)
    // still pass — those are tracked separately for incremental cleanup.
    ignoreDuringBuilds: false,
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

const sentryConfig = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  sentryUrl: 'https://sentry.timdobras.com/',
  // Token for source-map upload during `next build`. Without it the plugin
  // silently skips upload and Sentry shows minified stack traces. Provided as a
  // build-arg in CI (see Dockerfile + .gitlab-ci.yml).
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Tie uploaded source maps + the runtime SDK to the same release the CI
  // `sentry-release` job registers (rotten-brains@<sha>). Injected at build so
  // both client and server events carry it without a runtime env var.
  release: { name: process.env.SENTRY_RELEASE },
  // The plugin phones home to sentry.io by default — AdGuard blocks that host,
  // which stalls the build. We don't want plugin telemetry anyway.
  telemetry: false,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Webpack-specific options
  webpack: {
    // Automatically tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },
  },
};

// Only wrap with Serwist in production to avoid Turbopack/webpack conflicts in dev
const configWithSerwist =
  process.env.NODE_ENV === 'production' ? withSerwist(nextConfig) : nextConfig;

module.exports = withSentryConfig(configWithSerwist, sentryConfig);
