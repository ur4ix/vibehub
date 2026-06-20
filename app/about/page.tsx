import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export const metadata: Metadata = {
  title: 'About',
  description: 'The marketplace built by vibe coders, for vibe coders.',
}

const STATS = [
  { value: '0%', label: 'Fee your first month' },
  { value: 'Minutes', label: 'From ZIP to listed' },
  { value: 'Community', label: 'Reviewed for quality' },
  { value: 'Free', label: 'To join & publish' },
]

const VALUES = [
  {
    icon: '▢',
    title: 'Ship fast',
    body: "Vibe coding is about momentum. We don't slow you down with bureaucracy — you upload a ZIP and you're live.",
  },
  {
    icon: '◧',
    title: 'Build in public',
    body: 'Every repo gets a public page, a reaction counter, and a community chat that opens when people love your work.',
  },
  {
    icon: '☰',
    title: 'Fair economics',
    body: 'You set the price. We take nothing for your first month. After that, a small platform fee keeps the lights on.',
  },
  {
    icon: '▦',
    title: 'Quality over quantity',
    body: 'Every listing passes community review. Junk gets flagged. Good work rises — and earns.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b-2 border-border">
          <div className="pixel-grid absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// about'}</span>
            <h1 className="mt-5 max-w-2xl text-balance font-pixel text-2xl leading-[1.4] sm:text-3xl sm:leading-[1.4]">
              Built by vibe coders,<br />
              <span className="text-primary">for vibe coders</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
              Vydex started as a side project to answer one question: where do you sell the
              thing you just vibed into existence at 2 AM? Turns out, nowhere good. So we
              built it.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b-2 border-border">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="grid grid-cols-2 gap-px border-2 border-border bg-border lg:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label} className="bg-card px-6 py-8 text-center">
                  <p className="font-pixel text-2xl text-primary">{s.value}</p>
                  <p className="mt-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="border-b-2 border-border">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// values'}</span>
            <h2 className="mt-5 font-pixel text-xl leading-[1.5]">What we believe in</h2>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {VALUES.map((v) => (
                <div key={v.title} className="border-2 border-border bg-card p-6">
                  <span className="font-pixel text-3xl text-primary">{v.icon}</span>
                  <h3 className="mt-5 font-pixel text-[11px] leading-relaxed">{v.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="relative border-b-2 border-border">
          <div className="pixel-grid absolute inset-0 opacity-20" aria-hidden="true" />
          <div className="relative mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// story'}</span>
            <h2 className="mt-5 font-pixel text-xl leading-[1.5]">How it started</h2>
            <div className="mt-8 space-y-5 text-base leading-relaxed text-muted-foreground">
              <p>
                Vydex started from a simple frustration: vibe coders were shipping real, working
                software with AI — and had nowhere good to sell it. Gists, DMs and random chat
                channels aren&rsquo;t a marketplace.
              </p>
              <p>
                So we&rsquo;re building one. A place where the apps, components, prompts and
                templates you vibe into existence can be listed, discovered and bought — with
                quality checks and fair economics built in from the start.
              </p>
              <p>
                We&rsquo;re early and building in public. What you see today is the foundation;
                where it goes next is shaped by the people who actually use it.
              </p>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="border-b-2 border-border">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// team'}</span>
            <h2 className="mt-5 font-pixel text-xl leading-[1.5]">The builders</h2>
            <p className="mt-8 text-base leading-relaxed text-muted-foreground">
              Vydex is built by a small, independent team of vibe coders — the same people who
              wanted this marketplace and decided to make it. We&rsquo;re building in public and
              shipping fast.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Got feedback or want to get involved?{' '}
              <Link href="/contact" className="text-primary hover:underline">Say hi</Link>.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="scanlines relative overflow-hidden border-2 border-primary bg-card p-8 text-center pixel-shadow sm:p-14">
            <div className="relative">
              <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// join us'}</span>
              <h2 className="mx-auto mt-6 max-w-xl text-balance font-pixel text-xl leading-[1.5] sm:text-2xl">
                Ready to ship something great?
              </h2>
              <p className="mx-auto mt-5 max-w-md text-pretty leading-relaxed text-muted-foreground">
                Create your account and publish your first project in under 5 minutes.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/auth"
                  className="font-pixel inline-flex items-center justify-center border-2 px-6 py-3 text-[10px] uppercase leading-none tracking-wider border-primary bg-primary text-primary-foreground pixel-shadow-border transition-all duration-100 hover:brightness-110 active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  Get started — it&apos;s free
                </Link>
                <Link
                  href="/contact"
                  className="font-pixel inline-flex items-center justify-center border-2 px-6 py-3 text-[10px] uppercase leading-none tracking-wider border-border bg-transparent text-foreground pixel-shadow-border transition-all duration-100 hover:border-primary hover:text-primary active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  Talk to us
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
