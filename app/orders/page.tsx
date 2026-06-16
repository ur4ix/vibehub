'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Clock, Plus, Search } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelButton } from '@/components/pixel-button'
import { createClient } from '@/lib/supabase/client'

type OrderStatus = 'open' | 'in_progress' | 'review' | 'completed' | 'cancelled'

interface Order {
  id: string
  title: string
  description: string
  budget: number
  status: OrderStatus
  tags: string[]
  owner_id: string
  bids_count: number
  created_at: string
  owner?: { username: string | null }
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  open:        'Open',
  in_progress: 'In progress',
  review:      'In review',
  completed:   'Completed',
  cancelled:   'Cancelled',
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  open:        'text-primary border-primary bg-primary/10',
  in_progress: 'text-blue-400 border-blue-400/50 bg-blue-400/10',
  review:      'text-amber-400 border-amber-400/50 bg-amber-400/10',
  completed:   'text-green-400 border-green-400/50 bg-green-400/10',
  cancelled:   'text-muted-foreground border-border bg-secondary',
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const ALL_STATUSES: Array<'all' | OrderStatus> = ['all', 'open', 'in_progress', 'review', 'completed', 'cancelled']

export default function OrdersPage() {
  const router    = useRouter()
  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('orders')
      .select('*, owner:owner_id(username)')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setOrders((data as Order[] | null) ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = orders.filter((o) => {
    const matchesSearch =
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    return matchesSearch && (statusFilter === 'all' || o.status === statusFilter)
  })

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Heading */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// orders'}</span>
            <h1 className="mt-3 font-pixel text-xl">Order board</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Fixed-price development orders. Browse, bid, and get paid.
            </p>
          </div>
          <PixelButton className="shrink-0 px-5 py-2.5" onClick={() => router.push('/orders/new')}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create order
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
              placeholder="Search orders or skills…"
              className="w-full border-2 border-border bg-card py-3 pl-11 pr-4 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={
                  'font-pixel whitespace-nowrap border-2 px-3 py-2 text-[9px] uppercase tracking-wider transition-all duration-100 ' +
                  (statusFilter === s
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary')
                }
              >
                {s === 'all' ? 'All' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 animate-pulse border-2 border-border bg-card" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center border-2 border-border bg-card py-24 text-center">
            <ShoppingBag className="mb-4 h-10 w-10 text-muted-foreground/30" />
            <p className="font-pixel text-xs text-muted-foreground">
              {orders.length === 0 ? 'No orders yet' : 'No orders match your search'}
            </p>
            {orders.length === 0 && (
              <p className="mt-3 font-mono text-sm text-muted-foreground">
                <Link href="/orders/new" className="text-primary hover:underline">Create the first order</Link>
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="mb-5 font-mono text-xs text-muted-foreground">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="group flex flex-col border-2 border-border bg-card p-5 transition-all duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-primary pixel-shadow-border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate font-mono text-sm text-foreground group-hover:text-primary">{order.title}</h2>
                      <span className={`mt-1 inline-block border px-2 py-0.5 font-pixel text-[9px] uppercase tracking-wider ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <span className="shrink-0 border-2 border-green-400/50 bg-green-400/10 px-2 py-0.5 font-pixel text-[9px] text-green-400">
                      ${order.budget}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">{order.description}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {order.tags.slice(0, 3).map((t) => (
                      <span key={t} className="border border-border bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{t}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-3 border-t border-border pt-4 font-mono text-[10px] text-muted-foreground">
                    <span>{order.bids_count} bids</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(order.created_at)}</span>
                    {order.owner?.username && <span className="ml-auto truncate">@{order.owner.username}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
