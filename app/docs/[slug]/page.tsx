import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Markdown } from '@/components/markdown'
import { DOCS } from '@/lib/docs-content'

interface PageProps {
  params: Promise<{ slug: string }>
}

function humanize(slug: string) {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bVydex\b/i, 'Vydex')
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const doc = DOCS[slug]
  return { title: `${doc?.title ?? humanize(slug)} · Docs` }
}

export default async function DocArticlePage({ params }: PageProps) {
  const { slug } = await params
  const doc = DOCS[slug]
  const title = doc?.title ?? humanize(slug)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:px-6">
        <nav className="mb-8 font-mono text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary">~</Link>
          {' / '}
          <Link href="/docs" className="hover:text-primary">docs</Link>
          {' / '}
          <span className="text-foreground">{slug}</span>
        </nav>

        <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// guide'}</span>
        <h1 className="mt-4 text-balance font-pixel text-xl leading-[1.4]">{title}</h1>

        {doc ? (
          <article className="mt-2">
            <Markdown>{doc.body}</Markdown>
            <div className="mt-12 border-t-2 border-border pt-6">
              <p className="font-mono text-xs text-muted-foreground">
                Still stuck?{' '}
                <Link href="/contact" className="text-primary hover:underline">Ask the team</Link>
                {' · '}
                <Link href="/docs" className="text-primary hover:underline">Back to docs</Link>
              </p>
            </div>
          </article>
        ) : (
          <div className="mt-10 border-2 border-dashed border-border p-10 text-center">
            <p className="font-pixel text-[11px] text-muted-foreground">This guide is being written</p>
            <p className="mx-auto mt-4 max-w-md font-mono text-sm leading-relaxed text-muted-foreground">
              We&apos;re still putting this article together. In the meantime, the team is happy to
              help you directly.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/contact"
                className="font-pixel inline-flex items-center justify-center border-2 border-primary bg-primary px-5 py-3 text-[10px] uppercase leading-none tracking-wider text-primary-foreground pixel-shadow-border transition-all duration-100 hover:brightness-110 active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                Ask the team
              </Link>
              <Link
                href="/docs"
                className="font-pixel inline-flex items-center justify-center border-2 border-border bg-transparent px-5 py-3 text-[10px] uppercase leading-none tracking-wider text-foreground pixel-shadow-border transition-all duration-100 hover:border-primary hover:text-primary active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                Back to docs
              </Link>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
