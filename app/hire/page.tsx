'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Briefcase, ChevronRight, Clock, DollarSign, Tag, Users } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelButton } from '@/components/pixel-button'

const SAMPLE_JOBS: Job[] = [
  {
    id: '1',
    title: 'Full-stack Next.js developer for SaaS MVP',
    description: 'Looking for a vibe coder to build a subscription SaaS from scratch. App Router, Supabase, Stripe. Equity share on completion.',
    budget: 'Revenue share (10%)',
    budgetType: 'equity',
    tags: ['Next.js', 'Supabase', 'Stripe', 'TypeScript'],
    postedBy: 'startup_guy',
    postedAt: '2h ago',
    applicants: 3,
  },
  {
    id: '2',
    title: 'AI chatbot UI — React components only',
    description: 'Need pixel-perfect UI components for a chat interface. Design provided as Figma. No backend work.',
    budget: '$300 fixed',
    budgetType: 'fixed',
    tags: ['React', 'Tailwind', 'UI'],
    postedBy: 'aibuilder',
    postedAt: '5h ago',
    applicants: 7,
  },
  {
    id: '3',
    title: 'Telegram bot + admin panel (Python + Next.js)',
    description: 'Automate onboarding flow via Telegram with a simple admin dashboard for monitoring.',
    budget: '$500 fixed',
    budgetType: 'fixed',
    tags: ['Python', 'Telegram', 'Next.js'],
    postedBy: 'tgdev',
    postedAt: '1d ago',
    applicants: 12,
  },
]

interface Job {
  id: string
  title: string
  description: string
  budget: string
  budgetType: 'fixed' | 'equity' | 'hourly'
  tags: string[]
  postedBy: string
  postedAt: string
  applicants: number
}

const BUDGET_COLORS: Record<Job['budgetType'], string> = {
  fixed: 'text-primary border-primary bg-primary/10',
  equity: 'text-amber-400 border-amber-400/50 bg-amber-400/10',
  hourly: 'text-blue-400 border-blue-400/50 bg-blue-400/10',
}

export default function HirePage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'fixed' | 'equity' | 'hourly'>('all')

  const filtered = SAMPLE_JOBS.filter((j) => {
    const matchesSearch =
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    const matchesFilter = filter === 'all' || j.budgetType === filter
    return matchesSearch && matchesFilter
  })

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 font-mono text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">~</Link>
          {' / '}
          <span className="text-foreground">hire</span>
        </nav>

        {/* Header */}
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-pixel text-base leading-relaxed">Hiring Board</h1>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              Find vibe coders for your project. Fixed price, equity, or hourly.
            </p>
          </div>
          <PixelButton className="px-5 py-2.5 shrink-0" onClick={() => window.location.href = '/hire/new'}>
            + Post a job
          </PixelButton>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              type="search"
              placeholder="Search jobs or skills…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border-2 border-input bg-background px-4 py-2.5 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'fixed', 'equity', 'hourly'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
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

        {/* Job list */}
        {filtered.length === 0 ? (
          <div className="border-2 border-border bg-card py-16 text-center">
            <Briefcase className="mx-auto mb-4 h-10 w-10 text-muted-foreground/30" />
            <p className="font-mono text-sm text-muted-foreground">No jobs found.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((job) => (
              <Link
                key={job.id}
                href={`/hire/${job.id}`}
                className="group block border-2 border-border bg-card p-5 transition-all duration-100 hover:border-primary hover:pixel-shadow-border"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-mono text-sm text-foreground group-hover:text-primary">
                      {job.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                      {job.description}
                    </p>
                  </div>
                  <span className={`shrink-0 border-2 px-3 py-1 font-pixel text-[10px] whitespace-nowrap ${BUDGET_COLORS[job.budgetType]}`}>
                    {job.budget}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {job.tags.slice(0, 4).map((t) => (
                    <span key={t} className="border border-border bg-secondary px-2 py-1 font-mono text-[10px] text-muted-foreground">
                      {t}
                    </span>
                  ))}
                  <div className="ml-auto flex items-center gap-4 font-mono text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {job.applicants}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {job.postedAt}
                    </span>
                    <span>by @{job.postedBy}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Post CTA */}
        <div className="mt-12 border-2 border-dashed border-border bg-card p-8 text-center">
          <Briefcase className="mx-auto mb-4 h-8 w-8 text-muted-foreground/40" />
          <h3 className="font-pixel text-xs">Have a project in mind?</h3>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Post a job and reach hundreds of vibe coders in the community.
          </p>
          <PixelButton className="mt-5 px-6 py-2.5" onClick={() => window.location.href = '/hire/new'}>
            Post a job
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </PixelButton>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
