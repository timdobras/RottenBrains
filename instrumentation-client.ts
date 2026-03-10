// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  integrations: [Sentry.replayIntegration(), Sentry.browserTracingIntegration()],

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});

// Instrument client-side navigations for performance monitoring
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
