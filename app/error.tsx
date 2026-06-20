'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

// Route-level error boundary — a friendly page instead of a raw crash.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface in the browser console for debugging; no PII.
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="grid flex-1 place-items-center px-4 py-24">
        <div className="text-center">
          <p className="font-pixel text-5xl leading-none text-primary sm:text-6xl">500</p>
          <h1 className="mt-7 font-pixel text-sm leading-relaxed">Something broke</h1>
          <p className="mx-auto mt-4 max-w-sm font-mono text-sm leading-relaxed text-muted-foreground">
            An unexpected error happened on our side. You can try again, or head back home.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={reset}
              className="font-pixel inline-flex items-center justify-center border-2 border-primary bg-primary px-5 py-3 text-[10px] uppercase leading-none tracking-wider text-primary-foreground pixel-shadow-border transition-all duration-100 hover:brightness-110 active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              Try again
            </button>
            <Link
              href="/"
              className="font-pixel inline-flex items-center justify-center border-2 border-border bg-transparent px-5 py-3 text-[10px] uppercase leading-none tracking-wider text-foreground pixel-shadow-border transition-all duration-100 hover:border-primary hover:text-primary active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              Go home
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
