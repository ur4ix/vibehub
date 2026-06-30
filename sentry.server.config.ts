import * as Sentry from '@sentry/nextjs'
import { SENTRY_DSN } from '@/lib/sentry-dsn'

// Server-side (Node runtime) Sentry init. Errors only — no perf tracing — to
// keep within the free quota. Disabled outside production so local/dev noise
// doesn't reach the project.
Sentry.init({
  dsn: SENTRY_DSN,
  enabled: process.env.NEXT_PUBLIC_SENTRY_DISABLE !== '1',
  tracesSampleRate: 0,
})
