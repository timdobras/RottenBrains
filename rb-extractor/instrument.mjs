// Sentry initialization for the rb-extractor worker.
//
// MUST be loaded before anything else so the OpenTelemetry-based auto
// instrumentation can patch http/redis/etc. before bullmq & ioredis import
// them. The entrypoint runs `node --import ./instrument.mjs worker.mjs`, and
// it's also the first import in worker.mjs/server.mjs as a belt-and-braces.
//
// If SENTRY_DSN is unset, Sentry.init is a harmless no-op — the worker runs
// fine without it (e.g. local dev).
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
  release: process.env.SENTRY_RELEASE,

  // Performance tracing — each extract job becomes a transaction (see worker.mjs).
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),

  // Forward console.warn/console.error into Sentry Logs — the worker leans on
  // console logging heavily ([extract] <provider> failed, self-test, etc.).
  enableLogs: true,
  integrations: [Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] })],

  // Capture request/IP data — this is an internal service, not user-facing.
  sendDefaultPii: true,
});
