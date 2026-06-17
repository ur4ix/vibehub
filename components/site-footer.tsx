function GitHubIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 2.87-.39c.97 0 1.95.13 2.87.39 2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.73.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14 0 1.54-.02 2.78-.02 3.16 0 .31.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

function XIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function TelegramIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

// Only entries with a real href render — fill these in as channels go live.
const SOCIALS = [
  { label: 'GitHub', href: 'https://github.com/vydex-dev', Icon: GitHubIcon },
  { label: 'X', href: 'https://x.com/VydeXdev', Icon: XIcon },
  { label: 'Telegram', href: '', Icon: TelegramIcon }, // fill when the TG chat is live
].filter((s) => s.href)

const COLS = [
  {
    title: 'Marketplace',
    links: [
      { label: 'Explore', href: '/explore' },
      { label: 'Startups', href: '/startups' },
      { label: 'Hiring', href: '/hire' },
      { label: 'Orders', href: '/orders' },
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
      { label: 'Terms', href: '/terms' },
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
            {SOCIALS.length > 0 && (
              <div className="mt-6 flex items-center gap-3">
                {SOCIALS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="grid h-9 w-9 place-items-center border-2 border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <s.Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
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
              Privacy
            </a>
            <a href="/terms" className="transition-colors hover:text-primary">
              Terms
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
