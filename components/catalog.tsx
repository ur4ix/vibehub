import Link from 'next/link'

const CATEGORIES = [
  {
    icon: '▢',
    title: 'Apps',
    cat: 'apps',
    desc: 'Ready-made SaaS, bots and microservices. Deploy in minutes.',
  },
  {
    icon: '◧',
    title: 'UI Components',
    cat: 'ui-components',
    desc: 'Buttons, dashboards, forms. Copy — paste — ship.',
  },
  {
    icon: '☰',
    title: 'Prompts',
    cat: 'prompts',
    desc: 'Tested system prompts and agent chains that actually work.',
  },
  {
    icon: '▦',
    title: 'Templates',
    cat: 'templates',
    desc: 'Starters for Next.js, Vite and more. Backend included.',
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
            Everything you need to build on vibes
          </h2>
          <p className="mt-5 text-pretty leading-relaxed text-muted-foreground">
            Four categories, one bar for quality. Every item passes community
            review — no junk.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link
              key={c.title}
              href={`/explore?cat=${c.cat}`}
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
                Explore →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
