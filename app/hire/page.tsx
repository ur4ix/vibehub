'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Briefcase, ChevronRight, Clock, Users } from 'lucide-react'
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
  fixed:  'text-primary border-primary bg-primary/10',
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
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <nav className="mb-8 font-mono text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">~</Link>
          {' / '}
          <span className="text-foreground">hire</span>
        </nav>

        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-pixel text-base leading-relaxed">Hiring Board</h1>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              Find vibe coders for your project. Fixed price, equity, or hourly.
            </p>
          </div>
          <PixelButton className="px-5 py-2.5 shrink-0" onClick={() => router.push('/hire/new')}>
            + Post a job
          </PixelButton>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search" placeholder="Search jobs or skills…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border-2 border-input bg-background px-4 py-2.5 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
          />
          <div className="flex gap-2 flex-wrap">
            {(['all', 'fixed', 'equity', 'hourly'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={
                  'border-2 px-3 py-2 font-pixel text-[10px] uppercase tracking-wider transition-colors ' +
                  (filter === f
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary')
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse border-2 border-border bg-card" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-2 border-border bg-card py-16 text-center">
            <Briefcase className="mx-auto mb-4 h-10 w-10 text-muted-foreground/30" />
            <p className="font-mono text-sm text-muted-foreground">
              {jobs.length === 0 ? 'No jobs posted yet. Be the first!' : 'No jobs match your search.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((job) => (
              <Link key={job.id} href={`/hire/${job.id}`} className="group block border-2 border-border bg-card p-5 transition-all duration-100 hover:border-primary hover:pixel-shadow-border">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-mono text-sm text-foreground group-hover:text-primary">{job.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">{job.description}</p>
                  </div>
                  <span className={`shrink-0 border-2 px-3 py-1 font-pixel text-[10px] whitespace-nowrap ${BUDGET_COLORS[job.budget_type]}`}>
                    {BUDGET_LABELS[job.budget_type](job.budget_value)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {job.tags.slice(0, 4).map((t) => (
                    <span key={t} className="border border-border bg-secondary px-2 py-1 font-mono text-[10px] text-muted-foreground">{t}</span>
                  ))}
                  <div className="ml-auto flex items-center gap-4 font-mono text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{job.applicants_count}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(job.created_at)}</span>
                    {job.owner?.username && <span>@{job.owner.username}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12 border-2 border-dashed border-border bg-card p-8 text-center">
          <Briefcase className="mx-auto mb-4 h-8 w-8 text-muted-foreground/40" />
          <h3 className="font-pixel text-xs">Have a project in mind?</h3>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Post a job and reach hundreds of vibe coders in the community.
          </p>
          <PixelButton className="mt-5 px-6 py-2.5" onClick={() => router.push('/hire/new')}>
            Post a job <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </PixelButton>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
