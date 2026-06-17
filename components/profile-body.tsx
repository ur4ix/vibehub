'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Info } from 'lucide-react'
import { FollowersModal, type FollowTab } from '@/components/followers-modal'

// ─── shared types ─────────────────────────────────────────────────────────────
export interface ProfileJob {
  id: string
  title: string
  budget_type: 'fixed' | 'equity' | 'hourly'
  budget_value: number
  status: 'open' | 'closed'
}
export interface ProfileOrder {
  id: string
  title: string
  budget: number
  status: string
}
export interface RepoItem {
  id: string
  slug: string
  title: string
  description: string | null
  type: 'free' | 'paid'
  price_cents: number | null
  tags: string[] | null
  is_published: boolean
}
export interface StatItem {
  label: string
  value: number
  hint?: string
  /** followers/following tiles open the list modal */
  follow?: FollowTab
}

export function jobBudget(t: ProfileJob['budget_type'], v: number) {
  return t === 'fixed' ? `$${v}` : t === 'equity' ? `${v}%` : `$${v}/h`
}

// Shared status badge colours for jobs + orders (border + text, compact).
export function statusBadge(status: string) {
  switch (status) {
    case 'open':        return 'border-primary text-primary'
    case 'in_progress': return 'border-blue-400/50 text-blue-400'
    case 'review':      return 'border-amber-400/50 text-amber-400'
    case 'completed':   return 'border-green-400/50 text-green-400'
    default:            return 'border-border text-muted-foreground' // closed / cancelled
  }
}

function Stat({ stat, onFollow }: { stat: StatItem; onFollow?: (tab: FollowTab) => void }) {
  const clickable = Boolean(stat.follow && onFollow)
  const inner = (
    <>
      {stat.hint && (
        <span className="group/info absolute right-1.5 top-1.5 cursor-help">
          <Info className="h-3 w-3 text-muted-foreground/40 transition-colors group-hover/info:text-primary" />
          <span
            role="tooltip"
            className="pointer-events-none absolute right-0 top-5 z-20 w-44 border-2 border-border bg-card px-2.5 py-2 text-left font-mono text-[10px] normal-case leading-relaxed tracking-normal text-muted-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover/info:opacity-100"
          >
            {stat.hint}
          </span>
        </span>
      )}
      <div className="font-pixel text-sm text-primary">{stat.value}</div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</div>
    </>
  )
  const base = 'relative border-2 border-border bg-background px-4 py-3 text-center'
  return clickable ? (
    <button type="button" onClick={() => onFollow!(stat.follow!)} className={base + ' transition-colors hover:border-primary'}>
      {inner}
    </button>
  ) : (
    <div className={base}>{inner}</div>
  )
}

export function ProfileBody({
  userId,
  ownerUsername,
  stats,
  repos,
  jobs,
  orders,
  reposEmpty,
  reposHeading = 'Repositories',
}: {
  userId: string
  ownerUsername: string
  stats: StatItem[]
  repos: RepoItem[]
  jobs: ProfileJob[]
  orders: ProfileOrder[]
  reposEmpty: React.ReactNode
  reposHeading?: string
}) {
  const [followTab, setFollowTab] = useState<FollowTab | null>(null)

  return (
    <section>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <Stat key={s.label} stat={s} onFollow={setFollowTab} />
        ))}
      </div>

      <h2 className="mt-10 font-pixel text-xs uppercase tracking-wider">{reposHeading}</h2>

      {repos.length === 0 ? (
        <div className="mt-5 border-2 border-border bg-card p-8 text-center">{reposEmpty}</div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {repos.map((r) => (
            <Link
              key={r.id}
              href={`/${ownerUsername}/${r.slug}`}
              className="group block border-2 border-border bg-card p-5 transition-all duration-100 hover:border-primary hover:pixel-shadow-border"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="break-all font-mono text-sm text-foreground group-hover:text-primary">
                    {ownerUsername}/{r.slug}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {r.description ?? r.title}
                  </p>
                </div>
                <span className="shrink-0 border-2 border-green-400/50 bg-green-400/10 px-3 py-1 font-pixel text-[10px] text-green-400">
                  {r.type === 'free' ? 'Free' : r.price_cents ? `$${(r.price_cents / 100).toFixed(0)}` : 'Paid'}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {r.tags?.slice(0, 4).map((t) => (
                  <span key={t} className="border border-border bg-secondary px-2 py-1 font-mono text-[10px] text-muted-foreground">
                    {t}
                  </span>
                ))}
                <span className={'ml-auto font-mono text-[10px] ' + (r.is_published ? 'text-primary' : 'text-muted-foreground')}>
                  {r.is_published ? 'published' : 'draft'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {jobs.length > 0 && (
        <>
          <h2 className="mt-10 font-pixel text-xs uppercase tracking-wider">Jobs</h2>
          <div className="mt-5 flex flex-col gap-3">
            {jobs.map((j) => (
              <Link key={j.id} href={`/hire/${j.id}`} className="flex items-center justify-between gap-4 border-2 border-border bg-card px-5 py-4 transition-colors hover:border-primary">
                <p className="min-w-0 truncate font-mono text-sm text-foreground">{j.title}</p>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-pixel text-[9px] text-green-400">{jobBudget(j.budget_type, j.budget_value)}</span>
                  <span className={'border-2 px-2 py-1 font-pixel text-[8px] uppercase ' + statusBadge(j.status)}>{j.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {orders.length > 0 && (
        <>
          <h2 className="mt-10 font-pixel text-xs uppercase tracking-wider">Orders</h2>
          <div className="mt-5 flex flex-col gap-3">
            {orders.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between gap-4 border-2 border-border bg-card px-5 py-4 transition-colors hover:border-primary">
                <p className="min-w-0 truncate font-mono text-sm text-foreground">{o.title}</p>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-pixel text-[9px] text-green-400">${o.budget}</span>
                  <span className={'border-2 px-2 py-1 font-pixel text-[8px] uppercase ' + statusBadge(o.status)}>{o.status.replace('_', ' ')}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {followTab && (
        <FollowersModal userId={userId} initialTab={followTab} onClose={() => setFollowTab(null)} />
      )}
    </section>
  )
}
