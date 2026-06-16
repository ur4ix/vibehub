import Link from 'next/link'

export type LegalBlock =
  | { kind: 'p'; text: string }
  | { kind: 'sub'; text: string }
  | { kind: 'list'; items: string[] }

export interface LegalSection {
  id: string
  title: string
  blocks: LegalBlock[]
}

function BlockView({ block }: { block: LegalBlock }) {
  if (block.kind === 'sub') {
    return (
      <h3 className="mt-8 mb-3 font-pixel text-[11px] uppercase tracking-wider text-foreground">
        {block.text}
      </h3>
    )
  }
  if (block.kind === 'list') {
    return (
      <ul className="my-4 flex flex-col gap-2">
        {block.items.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-primary" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    )
  }
  return <p className="my-4 text-sm leading-relaxed text-muted-foreground">{block.text}</p>
}

export function LegalDoc({
  title,
  lastUpdated,
  intro,
  sections,
}: {
  title: string
  lastUpdated: string
  intro?: string
  sections: LegalSection[]
}) {
  return (
    <main>
      {/* Header */}
      <section className="relative overflow-hidden border-b-2 border-border">
        <div className="pixel-grid absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// legal'}</span>
          <h1 className="mt-5 font-pixel text-2xl leading-[1.4] sm:text-3xl sm:leading-[1.4]">{title}</h1>
          <p className="mt-5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
          {intro && <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{intro}</p>}
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        {/* Table of contents */}
        <nav aria-label="Sections" className="mb-12 border-2 border-border bg-card p-5">
          <p className="mb-3 font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">On this page</p>
          <ol className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id} className="font-mono text-xs">
                <a href={`#${s.id}`} className="text-muted-foreground transition-colors hover:text-primary">
                  <span className="text-primary">{String(i + 1).padStart(2, '0')}</span> {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-24 border-t-2 border-border pt-10 first:border-t-0 first:pt-0">
            <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">
              {`// ${String(i + 1).padStart(2, '0')}`}
            </span>
            <h2 className="mt-4 font-pixel text-lg leading-[1.5]">{s.title}</h2>
            <div className="mt-4">
              {s.blocks.map((block, bi) => (
                <BlockView key={bi} block={block} />
              ))}
            </div>
          </section>
        ))}

        {/* Contact */}
        <section id="contact" className="mt-10 scroll-mt-24 border-t-2 border-border pt-10">
          <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">
            {`// ${String(sections.length + 1).padStart(2, '0')}`}
          </span>
          <h2 className="mt-4 font-pixel text-lg leading-[1.5]">Contact Us</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Questions about this document or our practices? Reach us at:
          </p>
          <div className="mt-5 border-2 border-border bg-card p-5 font-mono text-sm">
            <p className="text-muted-foreground">
              Email:{' '}
              <a href="mailto:admin@vydex.dev" className="text-primary hover:underline">admin@vydex.dev</a>
            </p>
            <p className="mt-3 text-muted-foreground">Vydex</p>
            <p className="text-muted-foreground">
              <a href="https://vydex.dev" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                https://vydex.dev
              </a>
            </p>
          </div>
        </section>

        <div className="mt-14 text-center">
          <Link href="/" className="font-mono text-sm text-primary hover:underline">← Back to home</Link>
        </div>
      </section>
    </main>
  )
}
