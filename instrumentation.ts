import * as Sentry from '@sentry/nextjs'

// Loads the right Sentry config per runtime, and forwards server route/render
// errors to Sentry via the framework's onRequestError hook.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./sentry.server.config')
  if (process.env.NEXT_RUNTIME === 'edge') await import('./sentry.edge.config')
}

export const onRequestError = Sentry.captureRequestError
