// Sentry DSN — public by design (it ships in the client bundle). Env override
// wins; otherwise fall back to the configured project DSN so monitoring works
// without a build-time env var.
export const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  'https://801c8f72e08d0bc9fa0906e81ef8f0ac@o4511653889376256.ingest.de.sentry.io/4511653892522064'
