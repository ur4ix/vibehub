// Verification route (safe to delete). Throws so the error is forwarded to
// Sentry via instrumentation's onRequestError hook.
export function GET() {
  throw new Error('Sentry backend test (uncaught route error)')
}
