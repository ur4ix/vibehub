'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Briefcase, Clock, Users, Search } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelButton } from '@/components/pixel-button'
import { createClient } from '@/lib/supabase/client'

type BudgetType = 'fixed' | 'equity' | 'hourly'

interface Job {
  id: string
  title: string
  description: string
  budget_value: number
  budget_type: BudgetType
  tags: string[]
  owner_id: string
  applicants_count: number
  created_at: string
  owner?: { username: string | null }
}

const BUDGET_LABELS: Record<BudgetType, (v: number) => string> = {
  fixed:  (v) => `$${v} fixed`,
  equity: (v) => `${v}% equity`,
  hourly: (v) => `$${v}/h`,
}

const BUDGET_COLORS: Record<BudgetType, string> = {
  fixed:  'text-green-400 border-green-400/50 bg-green-400/10',
  equity: 'text-amber-400 border-amber-400/50 bg-amber-400/10',
  hourly: 'text-blue-400 border-blue-400/50 bg-blue-400/10',
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function HirePage() {
  const router = useRouter()
  const [jobs,   setJobs]   = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | BudgetType>('all')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('jobs')
      .select('*, owner:owner_id(username)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setJobs((data as Job[] | null) ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = jobs.filter((j) => {
    const matchesSearch =
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    return matchesSearch && (filter === 'all' || j.budget_type === filter)
  })

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {/* Heading */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// hiring'}</span>
            <h1 className="mt-3 font-pixel text-xl">Hiring board</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Find vibe coders for your project — fixed price, equity, or hourly.
            </p>
          </div>
          <PixelButton className="shrink-0 px-5 py-2.5" onClick={() => router.push('/hire/new')}>
            + Post a job
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
              placeholder="Search jobs or skills…"
              className="w-full border-2 border-border bg-card py-3 pl-11 pr-4 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'fixed', 'equity', 'hourly'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  'font-pixel whitespace-nowrap border-2 px-3 py-2 text-[9px] uppercase tracking-wider transition-all duration-100 ' +
                  (filter === f
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary')
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse border-2 border-border bg-card" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center border-2 border-border bg-card py-24 text-center">
            <Briefcase className="mb-4 h-10 w-10 text-muted-foreground/30" />
            <p className="font-pixel text-xs text-muted-foreground">
              {jobs.length === 0 ? 'No jobs posted yet' : 'No jobs match your search'}
            </p>
            {jobs.length === 0 && (
              <p className="mt-3 font-mono text-sm text-muted-foreground">
                <Link href="/hire/new" className="text-primary hover:underline">Post the first job</Link>
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="mb-5 font-mono text-xs text-muted-foreground">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((job) => (
                <div
                  key={job.id}
                  className="group relative flex flex-col border-2 border-border bg-card p-5 transition-all duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-primary pixel-shadow-border"
                >
                  <Link href={`/hire/${job.id}`} aria-label={job.title} className="absolute inset-0 z-[1]" />
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="truncate font-mono text-sm text-foreground group-hover:text-primary">{job.title}</h2>
                    <span className={`shrink-0 whitespace-nowrap border-2 px-2 py-0.5 font-pixel text-[9px] ${BUDGET_COLORS[job.budget_type]}`}>
                      {BUDGET_LABELS[job.budget_type](job.budget_value)}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">{job.description}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {job.tags.slice(0, 3).map((t) => (
                      <span key={t} className="border border-border bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{t}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-3 border-t border-border pt-4 font-mono text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{job.applicants_count}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(job.created_at)}</span>
                    {job.owner?.username && (
                      <Link href={`/u/${job.owner.username}`} className="relative z-[2] ml-auto truncate transition-colors hover:text-primary">
                        @{job.owner.username}
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
