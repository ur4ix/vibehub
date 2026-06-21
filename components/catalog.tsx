import Link from 'next/link'

const SECTIONS = [
  {
    icon: '▢',
    title: 'Explore',
    href: '/explore',
    desc: 'Buy and sell apps, components, prompts and templates.',
  },
  {
    icon: '◧',
    title: 'Startups',
    href: '/startups',
    desc: 'Discover startups and meet founders and investors.',
  },
  {
    icon: '☰',
    title: 'Hiring',
    href: '/hire',
    desc: 'Find vibe coders for your project, or post a job.',
  },
  {
    icon: '▦',
    title: 'Orders',
    href: '/orders',
    desc: 'Commission a custom build from the community.',
  },
]

export function Catalog() {
  return (
    <section id="catalog" className="border-b-2 border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">
            {'// catalog'}
          </span>
          <h2 className="mt-5 text-balance font-pixel text-xl leading-[1.5] sm:text-2xl sm:leading-[1.5]">
            Everything Vydex does, in one place
          </h2>
          <p className="mt-5 text-pretty leading-relaxed text-muted-foreground">
            Browse the marketplace, find startups, hire builders or order a custom
            build. Looking around is free — you only sign in to act.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map((c) => (
            <Link
              key={c.title}
              href={c.href}
              className="group block border-2 border-border bg-card p-6 transition-all duration-100 hover:-translate-x-1 hover:-translate-y-1 hover:border-primary pixel-shadow-border"
            >
              <span
                className="grid h-12 w-12 place-items-center border-2 border-border bg-secondary font-pixel text-lg text-primary"
                aria-hidden="true"
              >
                {c.icon}
              </span>
              <h3 className="mt-5 font-pixel text-xs leading-relaxed">{c.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
              <p className="mt-5 font-mono text-xs text-primary transition-transform group-hover:translate-x-1">
                Open →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
