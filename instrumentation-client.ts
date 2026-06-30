import * as Sentry from '@sentry/nextjs'
import { SENTRY_DSN } from '@/lib/sentry-dsn'

// Browser Sentry init — captures client-side errors. Errors only.
Sentry.init({
  dsn: SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
