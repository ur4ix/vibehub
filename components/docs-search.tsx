'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { DOCS } from '@/lib/docs-content'

interface Section {
  icon: string
  title: string
  articles: { title: string; slug: string }[]
}

// Live search + topic grid for /docs. Empty query → the full sectioned grid;
// typing → a flat list of articles matching the title, section or body text.
export function DocsSearch({ sections }: { sections: Section[] }) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()

  const results = useMemo(() => {
    if (!query) return null
    const flat = sections.flatMap((s) => s.articles.map((a) => ({ ...a, section: s.title })))
    return flat.filter((a) => {
      const body = (DOCS[a.slug]?.body ?? '').toLowerCase()
      return (
        a.title.toLowerCase().includes(query) ||
        a.section.toLowerCase().includes(query) ||
        body.includes(query)
      )
    })
  }, [query, sections])

  return (
    <div>
      <div className="relative max-w-lg">
        <label htmlFor="docs-search" className="sr-only">Search docs</label>
        <input
          id="docs-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search docs…"
          className="w-full border-2 border-border bg-card py-3 pl-4 pr-4 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />
      </div>

      {results === null ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => (
            <div key={s.title} className="border-2 border-border bg-card p-6 pixel-shadow-border">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center border-2 border-border bg-secondary font-pixel text-base text-primary" aria-hidden="true">
                  {s.icon}
                </span>
                <h3 className="font-pixel text-[11px] uppercase tracking-wider">{s.title}</h3>
              </div>
              <ul className="mt-5 space-y-2.5">
                {s.articles.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/docs/${a.slug}`}
                      className="flex items-center gap-2 font-mono text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      <span className="font-pixel text-[10px] text-primary" aria-hidden="true">›</span>
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="mt-8 font-mono text-sm text-muted-foreground">
          No results for “{q.trim()}”. Try a different term, or{' '}
          <Link href="/contact" className="text-primary hover:underline">ask the team</Link>.
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-2">
          <p className="mb-1 font-mono text-xs text-muted-foreground">
            {results.length} {results.length === 1 ? 'result' : 'results'}
          </p>
          {results.map((a) => (
            <Link
              key={a.slug}
              href={`/docs/${a.slug}`}
              className="flex items-center justify-between gap-4 border-2 border-border bg-card px-5 py-3 transition-colors hover:border-primary"
            >
              <span className="font-mono text-sm text-foreground">{a.title}</span>
              <span className="shrink-0 font-pixel text-[8px] uppercase tracking-wider text-muted-foreground">{a.section}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
