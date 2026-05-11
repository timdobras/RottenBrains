// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE,

  // Performance Monitoring: 100% in dev, 10% in prod by default; override with
  // SENTRY_TRACES_SAMPLE_RATE if you need a different value.
  tracesSampleRate: parseFloat(
    process.env.SENTRY_TRACES_SAMPLE_RATE ??
      (process.env.NODE_ENV === 'production' ? '0.1' : '1.0'),
  ),

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
