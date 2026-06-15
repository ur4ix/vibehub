'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Clock, ChevronRight, Plus } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelButton } from '@/components/pixel-button'
import { useAuth } from '@/components/auth-provider'
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
  const { user }  = useAuth()
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
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <nav className="mb-8 font-mono text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">~</Link>
          {' / '}
          <span className="text-foreground">orders</span>
        </nav>

        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-pixel text-base leading-relaxed">Order Board</h1>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              Fixed-price development orders. Browse, bid, and get paid.
            </p>
          </div>
          <PixelButton className="px-5 py-2.5 shrink-0" onClick={() => router.push('/orders/new')}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create order
          </PixelButton>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3">
          <input
            type="search" placeholder="Search orders or skills…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full border-2 border-input bg-background px-4 py-2.5 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
          />
          <div className="flex gap-2 flex-wrap">
            {ALL_STATUSES.map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={
                  'border-2 px-3 py-2 font-pixel text-[10px] uppercase tracking-wider transition-colors ' +
                  (statusFilter === s
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary')
                }
              >
                {s === 'all' ? 'All' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse border-2 border-border bg-card" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-2 border-border bg-card py-16 text-center">
            <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-muted-foreground/30" />
            <p className="font-mono text-sm text-muted-foreground">
              {orders.length === 0 ? 'No orders yet. Post the first one!' : 'No orders match your search.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`} className="group block border-2 border-border bg-card p-5 transition-all duration-100 hover:border-primary hover:pixel-shadow-border">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-mono text-sm text-foreground group-hover:text-primary">{order.title}</h2>
                      <span className={`border px-2 py-0.5 font-pixel text-[9px] uppercase tracking-wider ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">{order.description}</p>
                  </div>
                  <span className="shrink-0 border-2 border-primary bg-primary/10 px-3 py-1 font-pixel text-[10px] text-primary">
                    ${order.budget}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {order.tags.slice(0, 4).map((t) => (
                    <span key={t} className="border border-border bg-secondary px-2 py-1 font-mono text-[10px] text-muted-foreground">{t}</span>
                  ))}
                  <div className="ml-auto flex items-center gap-4 font-mono text-[10px] text-muted-foreground">
                    <span>{order.bids_count} bids</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(order.created_at)}</span>
                    {order.owner?.username && <span>@{order.owner.username}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {user && (
          <div className="mt-10 border-2 border-dashed border-border bg-card p-6 text-center">
            <p className="font-mono text-xs text-muted-foreground">
              Need something built?{' '}
              <Link href="/orders/new" className="text-primary hover:underline">
                Create an order <ChevronRight className="ml-0.5 inline h-3 w-3" />
              </Link>
            </p>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
