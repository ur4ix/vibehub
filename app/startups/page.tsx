'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Rocket, Clock, Search, Globe } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelButton } from '@/components/pixel-button'
import { createClient } from '@/lib/supabase/client'

type Stage = 'idea' | 'mvp' | 'launched' | 'revenue' | 'scaling'
type Funding = 'bootstrapped' | 'raising' | 'funded'

interface Startup {
  id: string
  name: string
  tagline: string
  industry: string | null
  stage: Stage
  funding_status: Funding
  raising_amount: number | null
  tags: string[]
  website: string | null
  owner_id: string
  created_at: string
  owner?: { username: string | null }
}

const STAGE_LABELS: Record<Stage, string> = {
  idea: 'Idea', mvp: 'MVP', launched: 'Launched', revenue: 'Revenue', scaling: 'Scaling',
}
const STAGE_COLORS: Record<Stage, string> = {
  idea:     'text-muted-foreground border-border bg-secondary',
  mvp:      'text-blue-400 border-blue-400/50 bg-blue-400/10',
  launched: 'text-primary border-primary bg-primary/10',
  revenue:  'text-green-400 border-green-400/50 bg-green-400/10',
  scaling:  'text-amber-400 border-amber-400/50 bg-amber-400/10',
}
const FUNDING_LABELS: Record<Funding, string> = {
  bootstrapped: 'Bootstrapped', raising: 'Raising', funded: 'Funded',
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const ALL_STAGES: Array<'all' | Stage> = ['all', 'idea', 'mvp', 'launched', 'revenue', 'scaling']

export default function StartupsPage() {
  const router = useRouter()
  const [startups, setStartups] = useState<Startup[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [stage, setStage]       = useState<'all' | Stage>('all')

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data } = await supabase
        .from('startups')
        .select('id, name, tagline, industry, stage, funding_status, raising_amount, tags, website, owner_id, created_at')
        .order('created_at', { ascending: false })
        .limit(60)
      const rows = (data as Startup[] | null) ?? []
      const ownerIds = [...new Set(rows.map((s) => s.owner_id))]
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', ownerIds)
        const map = new Map((profiles as { id: string; username: string }[] | null)?.map((p) => [p.id, p.username]) ?? [])
        for (const s of rows) s.owner = { username: map.get(s.owner_id) ?? null }
      }
      setStartups(rows)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = startups.filter((s) => {
    const q = search.toLowerCase()
    const matches = !q || s.name.toLowerCase().includes(q) || s.tagline.toLowerCase().includes(q) ||
      (s.industry?.toLowerCase().includes(q) ?? false) || s.tags.some((t) => t.toLowerCase().includes(q))
    return matches && (stage === 'all' || s.stage === stage)
  })

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {/* Heading */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// startups'}</span>
            <h1 className="mt-3 font-pixel text-xl">Startups</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Vibe-coded startups looking for investors, partners and collaborators. Discover what the community is building.
            </p>
          </div>
          <PixelButton className="shrink-0 px-5 py-2.5" onClick={() => router.push('/startups/new')}>
            <Rocket className="mr-1.5 h-3.5 w-3.5" />
            List your startup
          </PixelButton>
        </div>

        {/* Search + filters */}
        <div className="mb-8 flex flex-col gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search startups, industry or tags…"
              className="w-full border-2 border-border bg-card py-3 pl-11 pr-4 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_STAGES.map((s) => (
              <button
                key={s}
                onClick={() => setStage(s)}
                className={
                  'font-pixel whitespace-nowrap border-2 px-3 py-2 text-[9px] uppercase tracking-wider transition-all duration-100 ' +
                  (stage === s
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary')
                }
              >
                {s === 'all' ? 'All stages' : STAGE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-52 animate-pulse border-2 border-border bg-card" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center border-2 border-border bg-card py-24 text-center">
            <Rocket className="mb-4 h-10 w-10 text-muted-foreground/30" />
            <p className="font-pixel text-xs text-muted-foreground">
              {startups.length === 0 ? 'No startups yet' : 'No startups match your search'}
            </p>
            {startups.length === 0 && (
              <p className="mt-3 font-mono text-sm text-muted-foreground">
                <Link href="/startups/new" className="text-primary hover:underline">List the first one</Link>
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="mb-5 font-mono text-xs text-muted-foreground">
              {filtered.length} startup{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((s) => (
                <div
                  key={s.id}
                  className="group relative flex flex-col border-2 border-border bg-card p-5 transition-all duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-primary pixel-shadow-border"
                >
                  <Link href={`/startups/${s.id}`} aria-label={s.name} className="absolute inset-0 z-[1]" />
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="min-w-0 break-words font-mono text-sm text-foreground group-hover:text-primary">{s.name}</h2>
                    <span className={`shrink-0 whitespace-nowrap border px-2 py-0.5 font-pixel text-[9px] uppercase tracking-wider ${STAGE_COLORS[s.stage]}`}>
                      {STAGE_LABELS[s.stage]}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">{s.tagline}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
                    {s.industry && <span className="border border-border bg-secondary px-2 py-0.5">{s.industry}</span>}
                    <span className={'border px-2 py-0.5 ' + (s.funding_status === 'raising' ? 'border-green-400/50 bg-green-400/10 text-green-400' : 'border-border bg-secondary')}>
                      {FUNDING_LABELS[s.funding_status]}
                      {s.funding_status === 'raising' && s.raising_amount ? ` · $${s.raising_amount.toLocaleString()}` : ''}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-3 border-t border-border pt-4 font-mono text-[10px] text-muted-foreground">
                    {s.website && (
                      <a href={s.website} target="_blank" rel="noopener noreferrer" className="relative z-[2] flex items-center gap-1 transition-colors hover:text-primary">
                        <Globe className="h-3 w-3" />site
                      </a>
                    )}
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(s.created_at)}</span>
                    {s.owner?.username && (
                      <Link href={`/u/${s.owner.username}`} className="relative z-[2] ml-auto truncate transition-colors hover:text-primary">
                        @{s.owner.username}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
