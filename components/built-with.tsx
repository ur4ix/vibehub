// "Built with" — an infinite marquee of the AI/dev tools used to build Vydex.
// Monochrome brand marks so they sit quietly in the pixel theme.

function ClaudeMark(props: React.ComponentProps<'svg'>) {
  // Anthropic-style starburst
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden {...props}>
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * Math.PI) / 6
        const x = 12 + Math.cos(a)
        const y = 12 + Math.sin(a)
        return <line key={i} x1={12 + Math.cos(a) * 3} y1={12 + Math.sin(a) * 3} x2={x + Math.cos(a) * 8} y2={y + Math.sin(a) * 8} />
      })}
    </svg>
  )
}

function OpenAIMark(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.998-2.9 6.056 6.056 0 0 0-.748-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zM8.307 12.863l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.454l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  )
}

function CursorMark(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M5 2.5 19.5 11l-6.4 1.7a1.5 1.5 0 0 0-1.06 1.06L10.3 20.2z" />
    </svg>
  )
}

function VercelMark(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 3 22.5 21H1.5z" />
    </svg>
  )
}

function FigmaMark(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 1.412v6.157h3.117c1.698 0 3.078-1.38 3.078-3.078s-1.38-3.079-3.078-3.079h-3.117zm0 13.512H8.148c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.491 4.49-4.491h4.588v8.981zm-4.587-7.569c-1.698 0-3.078 1.381-3.078 3.079s1.38 3.078 3.078 3.078h3.117V7.355H8.148zm.005 16.52c-2.475 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v4.405c0 2.523-2.051 4.575-4.588 4.575zm0-7.568c-1.697 0-3.078 1.381-3.078 3.079s1.381 3.079 3.078 3.079c1.75 0 3.177-1.42 3.177-3.165v-2.993H8.153zm7.703 0h-.085c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h.085c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.49-4.49 4.49zm-.085-7.569c-1.698 0-3.078 1.381-3.078 3.079s1.38 3.078 3.078 3.078h.085c1.698 0 3.078-1.38 3.078-3.078s-1.38-3.079-3.078-3.079h-.085z" />
    </svg>
  )
}

interface Brand {
  name: string
  mark?: React.ReactNode
  /** rendered as a bold wordmark instead of an icon + name */
  wordmark?: string
}

const BRANDS: Brand[] = [
  { name: 'Claude', mark: <ClaudeMark className="h-5 w-5" /> },
  { wordmark: 'v0', name: 'v0' },
  { name: 'OpenAI', mark: <OpenAIMark className="h-5 w-5" /> },
  { name: 'Cursor', mark: <CursorMark className="h-5 w-5" /> },
  { name: 'Vercel', mark: <VercelMark className="h-5 w-5" /> },
  { name: 'Figma', mark: <FigmaMark className="h-5 w-5" /> },
]

// Repeat the set inside each copy so a single copy is always wider than the
// viewport — otherwise the -50% loop reveals a gap on wide screens (the
// "break / retrigger" effect).
const REPEAT = 4

function BrandRow({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={ariaHidden}>
      {Array.from({ length: REPEAT }).flatMap((_, rep) =>
        BRANDS.map((b) => (
          <li
            key={`${rep}-${b.name}`}
            className="flex items-center gap-2.5 px-8 text-muted-foreground transition-colors hover:text-foreground"
          >
            {b.wordmark ? (
              <span className="font-pixel text-base leading-none">{b.wordmark}</span>
            ) : (
              <>
                {b.mark}
                <span className="font-mono text-sm whitespace-nowrap">{b.name}</span>
              </>
            )}
          </li>
        )),
      )}
    </ul>
  )
}

export function BuiltWith() {
  return (
    <section className="py-10" aria-label="Built with">
      <p className="mb-7 text-center font-pixel text-[8px] uppercase tracking-wider text-primary">
        {'// Built with'}
      </p>
      <div className="marquee-mask group relative overflow-hidden">
        <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
          <BrandRow />
          <BrandRow ariaHidden />
        </div>
      </div>
    </section>
  )
}
