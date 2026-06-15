'use client'

import { useState } from 'react'

export function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="mt-16 border-2 border-border bg-card p-8 text-center sm:p-10">
      <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// newsletter'}</span>
      <h2 className="mt-5 font-pixel text-lg leading-[1.5]">Get new posts in your inbox</h2>
      <p className="mt-4 font-mono text-sm text-muted-foreground">Weekly. No noise. Unsubscribe any time.</p>

      {submitted ? (
        <p className="mt-6 font-pixel text-[10px] text-primary">✓ You&apos;re subscribed!</p>
      ) : (
        <form
          className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row"
          onSubmit={handleSubmit}
        >
          <input
            type="email"
            required
            placeholder="you@example.com"
            className="flex-1 border-2 border-border bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
          <button
            type="submit"
            className="font-pixel border-2 border-primary bg-primary px-5 py-3 text-[10px] uppercase leading-none tracking-wider text-primary-foreground pixel-shadow-border transition-all duration-100 hover:brightness-110 active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            Subscribe
          </button>
        </form>
      )}
    </div>
  )
}
