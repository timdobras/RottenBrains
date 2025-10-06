/** @type {import('next').NextConfig} */

module.exports = {
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
        pathname: '**/*', // Allows all paths
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '**/*', // Allows all paths
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '**/*', // Allows all paths
      },
      {
        protocol: 'https',
        hostname: 'ketxnamtpbvfvblowfoo.supabase.co',
        pathname: '**/*', // Allows all paths
      },
    ],
    dangerouslyAllowSVG: true, // Enable SVG support
  },
};
