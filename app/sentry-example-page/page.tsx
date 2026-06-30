'use client'

import * as Sentry from '@sentry/nextjs'

// Verification page (safe to delete). Click a button to send a test error to
// Sentry, then check your Sentry Issues.
export default function SentryExamplePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-mono text-lg">Sentry test</h1>
      <p className="font-mono text-xs text-muted-foreground">
        Click a button, then look in your Sentry Issues. Errors are only sent when
        the SDK is enabled (set NEXT_PUBLIC_SENTRY_DISABLE=1 to turn it off).
      </p>

      <button
        type="button"
        onClick={() => Sentry.captureException(new Error('Sentry frontend test (captured)'))}
        className="border-2 border-primary bg-primary px-4 py-2 font-mono text-sm text-primary-foreground"
      >
        Send captured error
      </button>

      <button
        type="button"
        onClick={() => { throw new Error('Sentry frontend test (uncaught)') }}
        className="border-2 border-border px-4 py-2 font-mono text-sm"
      >
        Throw uncaught error
      </button>

      <button
        type="button"
        onClick={async () => { await fetch('/api/sentry-example') }}
        className="border-2 border-border px-4 py-2 font-mono text-sm"
      >
        Trigger backend error
      </button>
    </main>
  )
}
