'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, SlidersHorizontal } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelAvatar, colorFromId } from '@/components/pixel-avatar'
import { createClient } from '@/lib/supabase/client'
import type { ExploreRepo, Repository } from '@/types/database'

// ─── constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'all', label: 'All', icon: '◈' },
  { value: 'apps', label: 'Apps', icon: '▢' },
  { value: 'ui-components', label: 'UI Components', icon: '◧' },
  { value: 'prompts', label: 'Prompts', icon: '☰' },
  { value: 'templates', label: 'Templates', icon: '▦' },
]

const PRICING = [
  { value: 'all', label: 'Any price' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
]

const SORT = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most popular' },
]

// ─── Card ─────────────────────────────────────────────────────────────────────

function RepoCard({ repo }: { repo: ExploreRepo }) {
  const icon = CATEGORIES.find((c) => c.value === repo.category)?.icon ?? '▢'
  const avatarColor = colorFromId(repo.owner_id)
  const coverColor = colorFromId(repo.id)

  return (
    <div className="group relative flex flex-col border-2 border-border bg-card p-5 transition-all duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-primary pixel-shadow-border">
      {/* whole-card link to the listing (overlay); the author link sits above it */}
      <Link href={`/${repo.owner_username}/${repo.slug}`} aria-label={repo.title} className="absolute inset-0 z-[1]" />

      {/* Cover: screenshot, or a generated banner when none */}
      <div className="relative mb-4 aspect-[16/9] overflow-hidden border-2 border-border">
        {repo.preview_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={repo.preview_image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div
            className="grid h-full w-full place-items-center"
            style={{ backgroundImage: `linear-gradient(135deg, ${coverColor}, var(--card))` }}
            aria-hidden="true"
          >
            <span className="font-pixel text-3xl text-white/90 drop-shadow">{icon}</span>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate font-mono text-sm font-medium text-foreground group-hover:text-primary">
          {repo.title}
        </h3>
        <span className="shrink-0 border border-green-400/50 bg-green-400/10 px-2 py-0.5 font-pixel text-[9px] text-green-400">
          {repo.type === 'free' ? 'Free' : repo.price_cents ? `$${(repo.price_cents / 100).toFixed(0)}` : 'Paid'}
        </span>
      </div>

      {repo.description && (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {repo.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {repo.tags.slice(0, 3).map((t) => (
          <span key={t} className="border border-border bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            {t}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
        <Link
          href={`/u/${repo.owner_username}`}
          className="relative z-[2] flex items-center gap-2 font-mono text-[10px] text-muted-foreground transition-colors hover:text-primary"
        >
          <PixelAvatar username={repo.owner_username} avatarColor={avatarColor} size={20} imageUrl={repo.owner_avatar_url ?? undefined} />
          @{repo.owner_username}
        </Link>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          {new Date(repo.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    </div>
  )
}

// ─── Filter pill ──────────────────────────────────────────────────────────────

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={
        'font-pixel whitespace-nowrap border-2 px-3 py-2 text-[9px] uppercase tracking-wider transition-all duration-100 ' +
        (active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary')
      }
    >
      {children}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ExploreContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [repos, setRepos] = useState<ExploreRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '')
  const [category, setCategory] = useState(searchParams.get('cat') ?? 'all')
  const [pricing, setPricing] = useState(searchParams.get('price') ?? 'all')
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'newest')

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === 'all' || value === 'newest' || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      router.replace(`/explore?${params.toString()}`, { scroll: false })
    },
    [searchParams, router],
  )

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()

      let query = supabase
        .from('repositories')
        .select('id, title, slug, description, type, price_cents, tags, category, created_at, owner_id, reaction_count, preview_images')
        .eq('is_published', true)

      if (category !== 'all') query = query.eq('category', category)
      if (pricing === 'free') query = query.eq('type', 'free')
      if (pricing === 'paid') query = query.eq('type', 'paid')
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }
      if (sort === 'popular') {
        query = query.order('reaction_count', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const { data: repoRowsRaw } = await query.limit(48)
      const repoRows = repoRowsRaw as Repository[] | null

      if (!repoRows?.length) { setRepos([]); setLoading(false); return }

      // Fetch owner usernames via profiles view
      const ownerIds = [...new Set(repoRows.map((r) => r.owner_id))]
      const { data: profilesRaw } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', ownerIds)
      const profiles = profilesRaw as { id: string; username: string; display_name: string | null; avatar_url: string | null }[] | null

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? [])

      setRepos(
        repoRows.map((r): ExploreRepo => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          description: r.description ?? null,
          type: r.type as 'free' | 'paid',
          price_cents: r.price_cents ?? null,
          tags: (r.tags ?? []) as string[],
          category: r.category ?? null,
          created_at: r.created_at,
          owner_id: r.owner_id,
          owner_username: profileMap.get(r.owner_id)?.username ?? 'unknown',
          owner_display_name: profileMap.get(r.owner_id)?.display_name ?? null,
          owner_avatar_url: profileMap.get(r.owner_id)?.avatar_url ?? null,
          preview_image: r.preview_images?.[0] ?? null,
        })),
      )
      setLoading(false)
    }
    load()
  }, [category, pricing, sort, searchQuery])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {/* Heading */}
        <div className="mb-8">
          <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// explore'}</span>
          <h1 className="mt-3 font-pixel text-xl">Browse repositories</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Discover apps, components, prompts and templates built by the vibe coding community.
          </p>
        </div>

        {/* Search + filters */}
        <div className="mb-8 flex flex-col gap-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                updateParams('q', e.target.value)
              }}
              placeholder="Search repositories…"
              className="w-full border-2 border-border bg-card py-3 pl-11 pr-4 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
          </div>

          {/* Filter rows */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Category pills */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <FilterPill
                  key={c.value}
                  active={category === c.value}
                  onClick={() => { setCategory(c.value); updateParams('cat', c.value) }}
                >
                  {c.icon} {c.label}
                </FilterPill>
              ))}
            </div>

            {/* Pricing + sort */}
            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex gap-1">
                {PRICING.map((p) => (
                  <FilterPill
                    key={p.value}
                    active={pricing === p.value}
                    onClick={() => { setPricing(p.value); updateParams('price', p.value) }}
                  >
                    {p.label}
                  </FilterPill>
                ))}
              </div>
              <div className="ml-2 flex gap-1">
                {SORT.map((s) => (
                  <FilterPill
                    key={s.value}
                    active={sort === s.value}
                    onClick={() => { setSort(s.value); updateParams('sort', s.value) }}
                  >
                    {s.label}
                  </FilterPill>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse border-2 border-border bg-card" />
            ))}
          </div>
        ) : repos.length === 0 ? (
          <div className="flex flex-col items-center justify-center border-2 border-border bg-card py-24 text-center">
            <span className="font-pixel text-4xl text-muted-foreground/30">▢</span>
            <p className="mt-6 font-pixel text-xs text-muted-foreground">No repositories found</p>
            <p className="mt-3 font-mono text-sm text-muted-foreground">
              Try adjusting filters or{' '}
              <Link href="/upload" className="text-primary hover:underline">
                publish the first one
              </Link>
            </p>
          </div>
        ) : (
          <>
            <p className="mb-5 font-mono text-xs text-muted-foreground">
              {repos.length} result{repos.length !== 1 ? 's' : ''}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {repos.map((r) => (
                <RepoCard key={r.id} repo={r} />
              ))}
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}

function ExploreSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8 h-8 w-48 animate-pulse bg-card border-2 border-border" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse border-2 border-border bg-card" />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<ExploreSkeleton />}>
      <ExploreContent />
    </Suspense>
  )
}
