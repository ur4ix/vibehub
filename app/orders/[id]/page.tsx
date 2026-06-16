'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShoppingBag, Clock, Trash2, X } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelButton } from '@/components/pixel-button'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/components/pixel-toast'
import { createClient } from '@/lib/supabase/client'

type OrderStatus = 'open' | 'in_progress' | 'review' | 'completed' | 'cancelled'

interface Order {
  id: string
  title: string
  description: string
  budget: number
  delivery_days: number | null
  tags: string[]
  status: OrderStatus
  bids_count: number
  owner_id: string
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

export default function OrderDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const { user } = useAuth()
  const toast    = useToast()

  const [order,      setOrder]      = useState<Order | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [deleting,   setDeleting]   = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('orders')
      .select('*, owner:owner_id(username)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setOrder(data as Order | null)
        setLoading(false)
      })
  }, [id])

  const isOwner = user && order && user.id === order.owner_id

  async function handleDelete() {
    if (!confirmDel) { setConfirmDel(true); return }
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) {
      toast.error('Delete failed', error.message)
      setDeleting(false)
      setConfirmDel(false)
      return
    }
    toast.success('Order deleted')
    router.push('/orders')
  }

  async function handleCancel() {
    setCancelling(true)
    const supabase = createClient()
    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', id)
    if (error) {
      toast.error('Failed to cancel order', error.message)
    } else {
      toast.info('Order cancelled')
      setOrder((o) => o ? { ...o, status: 'cancelled' } : o)
    }
    setCancelling(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
          <div className="h-8 w-48 animate-pulse bg-secondary" />
          <div className="mt-8 h-64 animate-pulse bg-card border-2 border-border" />
        </main>
        <SiteFooter />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="grid flex-1 place-items-center px-4">
          <div className="text-center">
            <p className="font-pixel text-xs text-muted-foreground">Order not found.</p>
            <Link href="/orders" className="mt-4 block font-mono text-sm text-primary hover:underline">← Back to order board</Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 font-mono text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">~</Link>
          {' / '}
          <Link href="/orders" className="hover:text-primary">orders</Link>
          {' / '}
          <span className="truncate text-foreground">{order.title.slice(0, 40)}{order.title.length > 40 ? '…' : ''}</span>
        </nav>

        {/* Main card */}
        <div className="border-2 border-border bg-card p-6 pixel-shadow-border sm:p-8">
          {/* Header row */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-border bg-background text-muted-foreground">
                <ShoppingBag className="h-4 w-4" />
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">order</span>
                <span className={`border px-2 py-0.5 font-pixel text-[9px] uppercase tracking-wider ${STATUS_COLORS[order.status]}`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </div>
            </div>
            <span className="shrink-0 border-2 border-green-400/50 bg-green-400/10 px-4 py-1.5 font-pixel text-[10px] text-green-400">
              ${order.budget}
            </span>
          </div>

          <h1 className="mt-5 font-pixel text-sm leading-relaxed">{order.title}</h1>

          {/* Meta */}
          <div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-[10px] text-muted-foreground">
            {order.owner?.username && <span>posted by @{order.owner.username}</span>}
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(order.created_at)}</span>
            {order.delivery_days && (
              <span>delivery: {order.delivery_days < 7 ? `${order.delivery_days}d` : order.delivery_days < 30 ? `${Math.round(order.delivery_days / 7)}w` : `${Math.round(order.delivery_days / 30)}mo`}</span>
            )}
            <span>{order.bids_count} bids</span>
          </div>

          {/* Description */}
          <div className="mt-6 border-t border-border pt-6">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Description</p>
            <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground">
              {order.description}
            </p>
          </div>

          {/* Tags */}
          {order.tags.length > 0 && (
            <div className="mt-6 border-t border-border pt-6">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Required skills</p>
              <div className="flex flex-wrap gap-2">
                {order.tags.map((t) => (
                  <span key={t} className="border border-border bg-secondary px-3 py-1.5 font-mono text-[10px] text-muted-foreground">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Escrow notice */}
          <div className="mt-6 border-t border-border pt-6">
            <div className="border-2 border-border bg-secondary px-4 py-3">
              <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                <span className="text-primary">✦</span>{' '}
                Payment is held in escrow. Funds are released only after the owner approves delivery.
              </p>
            </div>
          </div>

          {/* Owner actions */}
          {isOwner && (
            <div className="mt-6 border-t border-border pt-6">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Manage</p>
              <div className="flex flex-wrap gap-3">
                {order.status === 'open' && (
                  <PixelButton variant="outline" disabled={cancelling} onClick={handleCancel} className="gap-2">
                    <X className="h-3.5 w-3.5" />
                    {cancelling ? 'Cancelling…' : 'Cancel order'}
                  </PixelButton>
                )}
                <PixelButton
                  variant="outline"
                  disabled={deleting}
                  onClick={handleDelete}
                  className={'gap-2 ' + (confirmDel ? 'border-destructive text-destructive hover:bg-destructive/10' : '')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleting ? 'Deleting…' : confirmDel ? 'Confirm delete?' : 'Delete order'}
                </PixelButton>
                {confirmDel && !deleting && (
                  <button onClick={() => setConfirmDel(false)} className="font-mono text-xs text-muted-foreground hover:text-foreground">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Bid CTA (non-owners) */}
          {!isOwner && order.status === 'open' && (
            <div className="mt-6 border-t border-border pt-6">
              <PixelButton className="w-full py-3">
                Place a bid
              </PixelButton>
              <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
                Describe your approach and propose a price
              </p>
            </div>
          )}
        </div>

        <div className="mt-6">
          <Link href="/orders" className="font-mono text-xs text-muted-foreground hover:text-primary">
            ← Back to order board
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
