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

  // Session Replay — no always-on session recording (its rrweb DOM-mutation
  // observers + continuous buffering ran on every page and were a real
  // main-thread cost). We keep replay for ERRORS only, and even that is added
  // lazily once the browser is idle (below) so it never runs during initial
  // page load / hydration.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0, // capture a replay around errors

  integrations: [
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

// Add Session Replay (error capture) lazily, once the browser is idle, so its
// observers + buffering don't compete with first paint / hydration on load.
if (typeof window !== 'undefined') {
  const addReplay = () => Sentry.addIntegration(Sentry.replayIntegration());
  const w = window as unknown as {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
  };
  if (w.requestIdleCallback) {
    w.requestIdleCallback(addReplay, { timeout: 5000 });
  } else {
    setTimeout(addReplay, 3000);
  }
}

// Instrument client-side navigations for performance monitoring
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
