'use client'

import { useRouter } from 'next/navigation'
import { PixelButton } from './pixel-button'

export function Hero() {
  const router = useRouter()

  return (
    <section className="relative overflow-hidden border-b-2 border-border">
      <div className="pixel-grid absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 border-2 border-border bg-card px-3 py-2 font-pixel text-[8px] uppercase tracking-wider text-muted-foreground">
            <span className="h-2 w-2 bg-primary blink" aria-hidden="true" />
            v1.0 — open for builders
          </span>

          <h1 className="mt-8 text-balance font-pixel text-2xl leading-[1.4] tracking-tight sm:text-4xl md:text-5xl md:leading-[1.4]">
            Marketplace for{' '}
            <span className="text-shimmer">vibe coders</span>
          </h1>

          <p className="mx-auto mt-8 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Buy and sell ready-made apps, components, prompts and templates.
            Everything you built on vibes — now earns money.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <PixelButton onClick={() => {
              document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })
            }}>
              Browse catalog
            </PixelButton>
            <PixelButton variant="outline" onClick={() => router.push('/upload')}>
              Sell your project
            </PixelButton>
          </div>

          <div className="mx-auto mt-12 inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-2 border-border bg-card px-5 py-3 font-mono text-xs text-muted-foreground">
            <span>
              <span className="text-primary">0%</span> fee first month
            </span>
            <span className="hidden text-border sm:inline" aria-hidden="true">|</span>
            <span>
              <span className="text-primary">Minutes</span> to publish
            </span>
            <span className="hidden text-border sm:inline" aria-hidden="true">|</span>
            <span>
              <span className="text-primary">Community</span>-reviewed
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
