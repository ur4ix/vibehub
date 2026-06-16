const COLS = [
  {
    title: 'Marketplace',
    links: [
      { label: 'Explore', href: '/explore' },
      { label: 'Apps', href: '/explore?cat=apps' },
      { label: 'UI Components', href: '/explore?cat=ui-components' },
      { label: 'Prompts', href: '/explore?cat=prompts' },
      { label: 'Templates', href: '/explore?cat=templates' },
    ],
  },
  {
    title: 'Sellers',
    links: [
      { label: 'Publish project', href: '/upload' },
      { label: 'Pricing', href: '/#sellers' },
      { label: 'Review rules', href: '/docs/review-rules' },
      { label: 'Payouts', href: '/docs/payouts' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: '/contact' },
      { label: 'Docs', href: '/docs' },
      { label: 'Privacy', href: '/privacy' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="bg-background border-t-2 border-border">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="" aria-hidden="true" className="h-8 w-8 shrink-0 border-2 border-border" />
              <span className="font-pixel text-xs">VYDEX</span>
            </div>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A marketplace built by vibe coders, for vibe coders.
            </p>
          </div>

          {COLS.map((c) => (
            <div key={c.title}>
              <h3 className="font-pixel text-[9px] uppercase tracking-wider text-foreground">
                {c.title}
              </h3>
              <ul className="mt-5 space-y-3">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t-2 border-border pt-6 font-mono text-xs text-muted-foreground sm:flex-row">
          <span>© 2026 Vydex. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="transition-colors hover:text-primary">
              Privacy Policy
            </a>
            <span>
              Built on vibes <span className="text-primary blink">▮</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
