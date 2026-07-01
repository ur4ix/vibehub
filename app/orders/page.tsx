'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingBag } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelButton } from '@/components/pixel-button'
import { createClient } from '@/lib/supabase/client'
import { PROJECT_TYPES, orderCode, deliveryLabel } from '@/lib/orders'

interface Order {
  id: string
  title: string
  description: string
  budget: number
  budget_range: string | null
  delivery_days: number | null
  project_type: string | null
  tags: string[]
  status: string
  owner_id: string
  bids_count: number
  created_at: string
  owner?: { username: string | null }
}

type SortKey = 'newest' | 'budget' | 'fewest'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'budget', label: 'Budget' },
  { key: 'fewest', label: 'Fewest bids' },
]

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all')
  const [sort, setSort] = useState<SortKey>('newest')

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      // Only open orders belong on the public board — once a bid is accepted the
      // order lives on its own page, visible to the owner and executor only.
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(50)
      const rows = (data as Order[] | null) ?? []
      // Owner usernames come from the public `profiles` view — public.users is
      // RLS-restricted to the owner's own row, so a FK join returns null for others.
      const ownerIds = [...new Set(rows.map((o) => o.owner_id))]
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', ownerIds)
        const map = new Map((profiles as { id: string; username: string }[] | null)?.map((p) => [p.id, p.username]) ?? [])
        for (const o of rows) o.owner = { username: map.get(o.owner_id) ?? null }
      }
      setOrders(rows)
      setLoading(false)
    }
    load()
  }, [])

  const openCount = orders.filter((o) => o.status === 'open').length

  const visible = useMemo(() => {
    const list = orders.filter((o) => typeFilter === 'all' || o.project_type === typeFilter)
    const sorted = [...list]
    if (sort === 'budget') sorted.sort((a, b) => b.budget - a.budget)
    else if (sort === 'fewest') sorted.sort((a, b) => a.bids_count - b.bids_count)
    // 'newest' keeps the query order (created_at desc)
    return sorted
  }, [orders, typeFilter, sort])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 font-mono text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">~</Link>
          {' / '}
          <span className="text-foreground">orders</span>
        </nav>

        {/* Heading */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// order feed'}</span>
            <h1 className="mt-3 font-pixel text-2xl leading-tight">Pick an order</h1>
            <p className="mt-3 font-mono text-sm text-muted-foreground">
              {openCount} open development order{openCount !== 1 ? 's' : ''}
            </p>
          </div>
          <PixelButton className="shrink-0 px-5 py-2.5" onClick={() => router.push('/orders/new')}>
            + Create order
          </PixelButton>
        </div>

        {/* Type filters */}
        <div className="mt-8 flex flex-wrap gap-2">
          {(['all', ...PROJECT_TYPES] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={
                'whitespace-nowrap border-2 px-3 py-2 font-mono text-[11px] transition-all duration-100 ' +
                (typeFilter === t
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary')
              }
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Sort:</span>
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={
                'border-2 px-3 py-1.5 font-mono text-[11px] transition-all duration-100 ' +
                (sort === s.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary')
              }
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="mt-8 flex flex-col gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse border-2 border-border bg-card" />
            ))
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center border-2 border-border bg-card py-24 text-center">
              <ShoppingBag className="mb-4 h-10 w-10 text-muted-foreground/30" />
              <p className="font-pixel text-xs text-muted-foreground">
                {orders.length === 0 ? 'No open orders right now' : 'No open orders in this category'}
              </p>
              {orders.length === 0 && (
                <p className="mt-3 font-mono text-sm text-muted-foreground">
                  <Link href="/orders/new" className="text-primary hover:underline">Create one</Link>
                </p>
              )}
            </div>
          ) : (
            visible.map((order) => (
              <article
                key={order.id}
                className="group relative flex flex-col gap-5 border-2 border-border bg-card p-5 transition-colors hover:border-primary sm:flex-row sm:items-stretch sm:justify-between sm:p-6"
              >
                {/* Left: details */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-muted-foreground">
                    <span className="text-muted-foreground/70">{orderCode(order.id)}</span>
                    {order.project_type && (
                      <span className="border border-border bg-secondary px-2 py-0.5 text-muted-foreground">{order.project_type}</span>
                    )}
                    <span>{timeAgo(order.created_at)}</span>
                  </div>

                  <h2 className="mt-3 font-mono text-base text-foreground transition-colors group-hover:text-primary">
                    <Link href={`/orders/${order.id}`} className="after:absolute after:inset-0">{order.title}</Link>
                  </h2>

                  <p className="mt-2 line-clamp-2 max-w-2xl font-mono text-xs leading-relaxed text-muted-foreground">
                    {order.description}
                  </p>

                  {order.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {order.tags.slice(0, 4).map((t) => (
                        <span key={t} className="border border-border bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  )}

                  <p className="mt-4 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                    {order.owner?.username ? (
                      <Link href={`/u/${order.owner.username}`} className="relative z-[1] text-foreground/80 transition-colors hover:text-primary">
                        @{order.owner.username}
                      </Link>
                    ) : (
                      <span>author</span>
                    )}
                    <span>·</span>
                    <span>{order.bids_count} bid{order.bids_count !== 1 ? 's' : ''}</span>
                  </p>
                </div>

                {/* Right: budget + CTA */}
                <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                  <div className="border-2 border-border bg-background px-4 py-3 text-center">
                    <p className="font-pixel text-sm text-primary">{order.budget_range ?? `$${order.budget}`}</p>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {deliveryLabel(order.delivery_days)}
                    </p>
                  </div>
                  <Link
                    href={`/orders/${order.id}`}
                    className="relative z-[1] inline-flex items-center justify-center border-2 border-border bg-card px-4 py-2.5 font-pixel text-[10px] uppercase tracking-wider text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    Take order
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
