import Link from 'next/link'
import { PixelButton } from '@/components/pixel-button'

const TAGS = ['Next.js', 'TypeScript', 'Tailwind', 'AI SDK']

const STATS = [
  { label: 'Stars', value: '2.4k' },
  { label: 'Forks', value: '318' },
  { label: 'Sales', value: '1.1k' },
]

const FILE_TREE = [
  { name: 'app/', depth: 0 },
  { name: 'page.tsx', depth: 1 },
  { name: 'layout.tsx', depth: 1 },
  { name: 'components/', depth: 0 },
  { name: 'chat.tsx', depth: 1 },
  { name: 'lib/ai.ts', depth: 0 },
  { name: 'README.md', depth: 0 },
]

export function ListingDetail() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      {/* Breadcrumb */}
      <nav
        className="mb-8 flex items-center gap-2 font-mono text-xs text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <Link href="/" className="hover:text-primary">~/</Link>
        <span aria-hidden="true">/</span>
        <Link href="/#catalog" className="hover:text-primary">apps</Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground">ai-chat-starter</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div>
          <article className="border-2 border-border bg-card p-6 pixel-shadow-border sm:p-8">
            <div className="flex items-start gap-4">
              <span
                className="grid h-14 w-14 shrink-0 place-items-center border-2 border-border bg-secondary font-pixel text-xl text-primary"
                aria-hidden="true"
              >
                ▢
              </span>
              <div className="min-w-0">
                <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">
                  // app
                </span>
                <h1 className="mt-3 text-balance font-pixel text-lg leading-[1.5]">
                  ai-chat-starter
                </h1>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  by @neon_dev
                </p>
              </div>
            </div>

            <p className="mt-6 text-pretty leading-relaxed text-muted-foreground">
              Production-ready AI chat starter with streaming. Tool calling,
              message history, authentication and dark theme out of the box.
              Deploy to Vercel in one click.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {TAGS.map((t) => (
                <span
                  key={t}
                  className="border-2 border-border bg-secondary px-3 py-1.5 font-mono text-xs text-foreground"
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-7 grid grid-cols-3 border-2 border-border">
              {STATS.map((s, i) => (
                <div
                  key={s.label}
                  className={'px-4 py-4 text-center ' + (i < STATS.length - 1 ? 'border-r-2 border-border' : '')}
                >
                  <p className="font-pixel text-sm text-primary">{s.value}</p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </article>

          {/* File tree */}
          <div className="mt-6 border-2 border-border bg-card pixel-shadow-border">
            <div className="flex items-center gap-2 border-b-2 border-border bg-secondary px-4 py-3">
              <span className="h-3 w-3 border-2 border-border" aria-hidden="true" />
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                structure
              </span>
            </div>
            <ul className="p-4 font-mono text-sm">
              {FILE_TREE.map((f, i) => (
                <li
                  key={i}
                  className="py-1 text-muted-foreground"
                  style={{ paddingLeft: `${f.depth * 20}px` }}
                >
                  <span className="text-primary" aria-hidden="true">
                    {f.name.endsWith('/') ? '▸ ' : '  '}
                  </span>
                  {f.name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="border-2 border-border bg-card p-6 pixel-shadow-border">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Price
            </p>
            <p className="mt-2 font-pixel text-2xl text-primary">$29</p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              one-time payment — lifetime access
            </p>

            <PixelButton className="mt-6 w-full">Buy now</PixelButton>
            <PixelButton variant="outline" className="mt-3 w-full">
              Wishlist
            </PixelButton>

            <ul className="mt-6 flex flex-col gap-3 font-mono text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="text-primary" aria-hidden="true">✓</span>
                Full source code
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary" aria-hidden="true">✓</span>
                MIT license
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary" aria-hidden="true">✓</span>
                12 months of updates
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
