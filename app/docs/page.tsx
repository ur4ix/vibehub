import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { DocsSearch } from '@/components/docs-search'

export const metadata: Metadata = {
  title: 'Docs',
  description: 'Documentation for buyers, sellers and contributors.',
}

const SECTIONS = [
  {
    icon: '▢',
    title: 'Getting started',
    articles: [
      { title: 'What is Vydex?', slug: 'what-is-vydex' },
      { title: 'Creating your account', slug: 'create-account' },
      { title: 'Publishing your first project', slug: 'first-project' },
      { title: 'Uploading a ZIP archive', slug: 'zip-upload' },
    ],
  },
  {
    icon: '◧',
    title: 'Selling',
    articles: [
      { title: 'Pricing your repository', slug: 'pricing' },
      { title: 'Free vs. paid listings', slug: 'free-vs-paid' },
      { title: 'Categories and tags', slug: 'categories-tags' },
      { title: 'Getting your first sale', slug: 'first-sale' },
    ],
  },
  {
    icon: '☰',
    title: 'Buying',
    articles: [
      { title: 'Browsing the catalog', slug: 'browsing' },
      { title: 'Purchasing a repository', slug: 'purchasing' },
      { title: 'Downloading source code', slug: 'downloading' },
      { title: 'Refund policy', slug: 'refunds' },
      { title: 'Review rules', slug: 'review-rules' },
    ],
  },
  {
    icon: '▦',
    title: 'Account & security',
    articles: [
      { title: 'Two-factor authentication', slug: '2fa' },
      { title: 'Changing your email', slug: 'change-email' },
      { title: 'GitHub OAuth login', slug: 'github-oauth' },
      { title: 'Data & privacy', slug: 'privacy' },
    ],
  },
  {
    icon: '▢',
    title: 'Payments',
    articles: [
      { title: 'Paying with crypto', slug: 'paying-with-crypto' },
      { title: 'Supported coins & networks', slug: 'supported-coins' },
      { title: 'Seller payouts', slug: 'payouts' },
      { title: 'Platform fees', slug: 'fees' },
    ],
  },
  {
    icon: '◧',
    title: 'API & integrations',
    articles: [
      { title: 'API overview', slug: 'api-overview' },
      { title: 'Authentication', slug: 'api-auth' },
      { title: 'Webhooks', slug: 'webhooks' },
      { title: 'Rate limits', slug: 'rate-limits' },
    ],
  },
]

const QUICKSTART = [
  { step: '01', title: 'Create account', desc: 'Sign up with GitHub or email in under a minute.', href: '/auth' },
  { step: '02', title: 'Upload your code', desc: 'Pack your project as a ZIP and fill in the details.', href: '/upload' },
  { step: '03', title: 'Set your price', desc: 'Free or paid — you decide. We take 0% the first month.', href: '/upload' },
  { step: '04', title: 'Go live', desc: 'Hit publish. Your listing is immediately visible to the community.', href: '/explore' },
]

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* Header */}
        <section className="relative border-b-2 border-border">
          <div className="pixel-grid absolute inset-0 opacity-30" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// documentation'}</span>
            <h1 className="mt-5 font-pixel text-2xl leading-[1.4]">Vydex docs</h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              Everything you need to publish, buy and manage repositories on the platform.
            </p>
          </div>
        </section>

        {/* Quickstart */}
        <section className="border-b-2 border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// quickstart'}</span>
            <h2 className="mt-5 font-pixel text-xl leading-[1.5]">Get up and running</h2>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {QUICKSTART.map((q) => (
                <Link
                  key={q.step}
                  href={q.href}
                  className="group border-2 border-border bg-card p-5 transition-all duration-100 hover:border-primary pixel-shadow-border"
                >
                  <span className="font-pixel text-2xl text-primary">{q.step}</span>
                  <h3 className="mt-4 font-pixel text-[11px] leading-relaxed group-hover:text-primary">{q.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{q.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Article grid */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// all topics'}</span>
          <h2 className="mt-5 mb-8 font-pixel text-xl leading-[1.5]">Browse by topic</h2>

          <DocsSearch sections={SECTIONS} />
        </section>

        {/* Need help? */}
        <section className="border-t-2 border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <div>
                <p className="font-pixel text-xs">Can&apos;t find what you need?</p>
                <p className="mt-2 font-mono text-sm text-muted-foreground">
                  Our team and community are here to help.
                </p>
              </div>
              <div className="flex gap-4">
                <Link
                  href="/contact"
                  className="font-pixel inline-flex items-center justify-center border-2 border-primary bg-primary px-5 py-3 text-[10px] uppercase leading-none tracking-wider text-primary-foreground pixel-shadow-border transition-all duration-100 hover:brightness-110 active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  Contact us
                </Link>
                <a
                  href="https://x.com/VydeXdev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-pixel inline-flex items-center justify-center border-2 border-border bg-transparent px-5 py-3 text-[10px] uppercase leading-none tracking-wider text-foreground pixel-shadow-border transition-all duration-100 hover:border-primary hover:text-primary active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  Follow on X
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
