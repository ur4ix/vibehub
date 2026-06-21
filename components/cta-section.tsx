'use client'

import { useRouter } from 'next/navigation'
import { PixelButton } from './pixel-button'

export function CtaSection() {
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement)?.value
    const params = email ? `?email=${encodeURIComponent(email)}` : ''
    router.push(`/auth${params}`)
  }

  return (
    <section className="relative border-b-2 border-border">
      <div className="pixel-grid absolute inset-0 opacity-30" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="scanlines relative overflow-hidden border-2 border-primary bg-card p-8 text-center pixel-shadow sm:p-14">
          <div className="relative">
            <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">
              {'// ready to start?'}
            </span>
            <h2 className="mx-auto mt-6 max-w-2xl text-balance font-pixel text-xl leading-[1.5] sm:text-3xl sm:leading-[1.45]">
              Turn your vibes into income
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-pretty leading-relaxed text-muted-foreground">
              Registration is free. First month — 0% fee. Publish your
              first project today.
            </p>

            <form
              className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row"
              onSubmit={handleSubmit}
            >
              <label htmlFor="cta-email" className="sr-only">
                Email address
              </label>
              <input
                id="cta-email"
                name="email"
                type="email"
                required
                placeholder="you@vydex.dev"
                className="flex-1 border-2 border-border bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              />
              <PixelButton type="submit">Create account</PixelButton>
            </form>

            <p className="mt-5 font-mono text-xs text-muted-foreground">
              Free to start. No card needed, no spam, no tracking.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
