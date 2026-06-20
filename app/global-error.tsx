'use client'

import { useEffect } from 'react'

// Catches errors in the root layout itself (must render its own <html>/<body>).
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en" className="dark">
      <body
        style={{
          background: '#0a0a0a',
          color: '#e5e5e5',
          fontFamily: 'monospace',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Something broke</h1>
          <p style={{ color: '#a3a3a3', marginBottom: '1.5rem' }}>An unexpected error happened. Please try again.</p>
          <button
            onClick={reset}
            style={{ border: '2px solid #e5e5e5', background: '#e5e5e5', color: '#0a0a0a', padding: '0.75rem 1.25rem', cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '1px' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
