import * as Sentry from '@sentry/nextjs'
import { SENTRY_DSN } from '@/lib/sentry-dsn'

// Edge runtime Sentry init (proxy + edge routes). Errors only.
Sentry.init({
  dsn: SENTRY_DSN,
  enabled: process.env.NEXT_PUBLIC_SENTRY_DISABLE !== '1',
  tracesSampleRate: 0,
})
