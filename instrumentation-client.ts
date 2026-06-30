// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Performance Monitoring: 100% in dev, 10% in prod by default; override with
  // NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE if you need a different value.
  tracesSampleRate: parseFloat(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ??
      (process.env.NODE_ENV === 'production' ? '0.1' : '1.0'),
  ),

  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  integrations: [
    Sentry.replayIntegration(),
    Sentry.browserTracingIntegration(),
    // Forward browser console.warn/console.error into Sentry Logs.
    Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
  ],

  // Capture structured logs (Logs product) + user IP for richer context.
  enableLogs: true,
  sendDefaultPii: true,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});

// Instrument client-side navigations for performance monitoring
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
