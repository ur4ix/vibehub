'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShoppingBag, Clock, Trash2, X, Send } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelButton } from '@/components/pixel-button'
import { PixelAvatar, colorFromId } from '@/components/pixel-avatar'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/components/pixel-toast'
import { createClient } from '@/lib/supabase/client'
import { containsBanned, BANNED_MESSAGE } from '@/lib/banned-words'

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

interface Bid {
  id: string
  amount: number
  message: string
  created_at: string
  bidder: { username: string; avatar_url: string | null } | null
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
  // Bid flow
  const [bidPlaced,  setBidPlaced]  = useState(false)
  const [showBid,    setShowBid]    = useState(false)
  const [bidAmount,  setBidAmount]  = useState('')
  const [bidMsg,     setBidMsg]     = useState('')
  const [bidding,    setBidding]    = useState(false)
  const [bids,       setBids]       = useState<Bid[]>([])
  const [isStaff,    setIsStaff]    = useState(false)

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    let active = true
    supabase.rpc('is_staff').then(({ data }) => { if (active) setIsStaff(Boolean(data)) })
    return () => { active = false }
  }, [user])

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data } = await supabase.from('orders').select('*').eq('id', id).single()
      const o = data as Order | null
      if (o) {
        // Owner from the public `profiles` view (users is RLS-restricted to self).
        const { data: prof } = await supabase.from('profiles').select('username').eq('id', o.owner_id).maybeSingle()
        o.owner = { username: (prof as { username: string } | null)?.username ?? null }
      }
      setOrder(o)
      setLoading(false)
    }
    load()
  }, [id])

  // Has the current user already bid?
  useEffect(() => {
    if (!id || !user) return
    const supabase = createClient()
    let active = true
    supabase
      .from('order_bids')
      .select('id')
      .eq('order_id', id)
      .eq('bidder_id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (active) setBidPlaced(Boolean(data)) })
    return () => { active = false }
  }, [id, user])

  // Owner: load bids (with their public profiles).
  useEffect(() => {
    if (!order || !user || user.id !== order.owner_id) return
    const supabase = createClient()
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('order_bids')
        .select('id, bidder_id, amount, message, created_at')
        .eq('order_id', order.id)
        .order('amount', { ascending: true })
      const rows = (data as { id: string; bidder_id: string; amount: number; message: string; created_at: string }[] | null) ?? []
      const ids = [...new Set(rows.map((r) => r.bidder_id))]
      const map = new Map<string, { username: string; avatar_url: string | null }>()
      if (ids.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, username, avatar_url').in('id', ids)
        for (const p of (profs as { id: string; username: string; avatar_url: string | null }[] | null) ?? []) {
          map.set(p.id, { username: p.username, avatar_url: p.avatar_url })
        }
      }
      if (!active) return
      setBids(rows.map((r) => ({
        id: r.id, amount: r.amount, message: r.message, created_at: r.created_at,
        bidder: map.get(r.bidder_id) ?? null,
      })))
    })()
    return () => { active = false }
  }, [order, user])

  async function handleBid(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { router.push('/auth'); return }
    const amount = Number(bidAmount)
    if (!bidMsg.trim() || !Number.isFinite(amount) || amount <= 0 || bidding) return
    if (containsBanned(bidMsg)) { toast.error('Not allowed', BANNED_MESSAGE); return }
    setBidding(true)
    const supabase = createClient()
    const { error } = await supabase.from('order_bids').insert({
      order_id: id, bidder_id: user.id, amount, message: bidMsg.trim(),
    })
    setBidding(false)
    if (error) {
      toast.error('Could not place bid', error.message)
      return
    }
    setBidPlaced(true)
    setShowBid(false)
    setBidAmount('')
    setBidMsg('')
    setOrder((o) => o ? { ...o, bids_count: o.bids_count + 1 } : o)
    toast.success('Bid placed!', 'The poster has been notified.')
  }

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
            {order.owner?.username && (
              <span>posted by <Link href={`/u/${order.owner.username}`} className="transition-colors hover:text-primary">@{order.owner.username}</Link></span>
            )}
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

          {/* Owner / moderator actions */}
          {(isOwner || isStaff) && (
            <div className="mt-6 border-t border-border pt-6">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{isOwner ? 'Manage' : 'Moderate'}</p>
              <div className="flex flex-wrap gap-3">
                {isOwner && order.status === 'open' && (
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
              {bidPlaced ? (
                <div className="border-2 border-green-400/40 bg-green-400/10 px-4 py-3 text-center font-mono text-xs text-green-400">
                  ✓ Your bid has been placed
                </div>
              ) : showBid ? (
                <form onSubmit={handleBid}>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Your price (USD)</p>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">$</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={String(order.budget)}
                      className="w-full border-2 border-input bg-background py-2 pl-7 pr-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
                      autoFocus
                    />
                  </div>
                  <p className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Your approach</p>
                  <textarea
                    rows={4}
                    value={bidMsg}
                    onChange={(e) => setBidMsg(e.target.value)}
                    placeholder="How would you tackle this? Timeline, relevant experience…"
                    className="w-full resize-none border-2 border-input bg-background px-3 py-2 font-mono text-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <PixelButton type="submit" disabled={bidding || !bidMsg.trim() || !(Number(bidAmount) > 0)} className="gap-2 py-2.5">
                      <Send className="h-3.5 w-3.5" />
                      {bidding ? 'Placing…' : 'Place bid'}
                    </PixelButton>
                    <button type="button" onClick={() => setShowBid(false)} className="font-mono text-xs text-muted-foreground hover:text-foreground">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <PixelButton className="w-full py-3" onClick={() => user ? setShowBid(true) : router.push('/auth')}>
                    Place a bid
                  </PixelButton>
                  <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
                    Describe your approach and propose a price
                  </p>
                </>
              )}
            </div>
          )}

          {/* Bids (owner only) */}
          {isOwner && (
            <div className="mt-6 border-t border-border pt-6">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Bids{bids.length > 0 && <span className="ml-1 text-foreground">({bids.length})</span>}
              </p>
              {bids.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">No bids yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {bids.map((b) => (
                    <div key={b.id} className="border-2 border-border bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <Link
                          href={b.bidder ? `/u/${b.bidder.username}` : '#'}
                          className="group flex items-center gap-2"
                        >
                          <PixelAvatar
                            username={b.bidder?.username ?? '?'}
                            avatarColor={colorFromId(b.id)}
                            size={24}
                            imageUrl={b.bidder?.avatar_url ?? undefined}
                          />
                          <span className="font-mono text-xs text-foreground group-hover:text-primary">
                            @{b.bidder?.username ?? 'unknown'}
                          </span>
                        </Link>
                        <span className="shrink-0 border-2 border-green-400/50 bg-green-400/10 px-2 py-0.5 font-pixel text-[9px] text-green-400">
                          ${b.amount}
                        </span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">{b.message}</p>
                      <p className="mt-2 font-mono text-[10px] text-muted-foreground">{timeAgo(b.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
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
