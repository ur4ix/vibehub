'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Download, ShoppingCart, Star, GitFork, Eye,
  Calendar, Tag, Send, ExternalLink, Heart, Trash2, History, Sparkles, Info, Wallet,
} from 'lucide-react'
import type { RepositoryVersion } from '@/types/database'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelButton } from '@/components/pixel-button'
import { PixelAvatar, colorFromId } from '@/components/pixel-avatar'
import { RepoFiles } from '@/components/repo-files'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/components/pixel-toast'
import { createClient } from '@/lib/supabase/client'
import { containsBanned, BANNED_MESSAGE } from '@/lib/banned-words'
import { SECURITY_CATALOG, SEVERITY_STYLE } from '@/lib/security-scan'
import { VulnFinding } from '@/components/vuln-finding'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RepoDetail {
  id: string
  title: string
  slug: string
  description: string | null
  readme: string | null
  type: 'free' | 'paid'
  price_cents: number | null
  tags: string[]
  category: string | null
  storage_path: string | null
  github_url: string | null
  demo_url: string | null
  preview_images: string[] | null
  file_manifest: string[] | null
  ai_signals: string[] | null
  security_flags: string[] | null
  vuln_findings: string[] | null
  source_sha256: string | null
  reaction_count: number
  fork_count: number
  average_rating: number
  review_count: number
  purchase_count: number
  view_count: number
  is_published: boolean
  published_at: string | null
  created_at: string
  owner_id: string
  owner: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
    reputation: number
  } | null
}

interface ReviewRow {
  id: string
  rating: number
  comment: string | null
  created_at: string
  verified_purchase: boolean
  reviewer: { username: string; avatar_url: string | null } | null
}

interface SimilarRepo {
  id: string
  title: string
  slug: string
  type: 'free' | 'paid'
  price_cents: number | null
  category: string | null
  tags: string[]
  owner: { username: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  apps: '▢',
  'ui-components': '◧',
  prompts: '☰',
  templates: '▦',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={'h-3 w-3 ' + (i < Math.round(value) ? 'fill-primary text-primary' : 'text-muted-foreground/30')}
        />
      ))}
    </span>
  )
}

// Interactive star picker. Isolated component so hover state only re-renders
// these 5 stars — not the whole (large) listing page.
function ReviewStars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="mb-3 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHover(s)}
          onClick={() => onChange(s)}
          aria-label={`Rate ${s} stars`}
        >
          <Star className={'h-4 w-4 transition-colors ' + (s <= (hover || value) ? 'fill-primary text-primary' : 'text-muted-foreground/30')} />
        </button>
      ))}
      <span className="ml-2 font-mono text-[10px] text-muted-foreground">{value}/5</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ListingView({ id }: { id: string }) {
  const router   = useRouter()
  const { user } = useAuth()
  const toast    = useToast()

  const [repo,      setRepo]      = useState<RepoDetail | null>(null)
  const [reviews,   setReviews]   = useState<ReviewRow[]>([])
  const [similar,   setSimilar]   = useState<SimilarRepo[]>([])
  const [versions,  setVersions]  = useState<RepositoryVersion[]>([])
  const [loading,   setLoading]   = useState(true)
  const [comment,   setComment]   = useState('')
  const [rating,    setRating]    = useState(5)
  const [submitting, setSubmitting] = useState(false)
  // Review eligibility: reviews are gated to buyers with a completed purchase
  // (enforced by the validate_review trigger + RLS). null = not yet checked.
  const [purchaseId, setPurchaseId] = useState<string | null>(null)
  const [escrowStatus, setEscrowStatus] = useState<string | null>(null)
  const [releaseAt, setReleaseAt] = useState<string | null>(null)
  const [escrowBusy, setEscrowBusy] = useState(false)
  const [hasReviewed, setHasReviewed] = useState(false)
  // Staff (admin/moderator) — can delete repos and reviews
  const [isStaff, setIsStaff] = useState(false)
  // Likes (reactions)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [likeBusy, setLikeBusy] = useState(false)
  const [forking, setForking] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [buying, setBuying] = useState(false)
  // Internal balance — enables a "pay with balance" option when it covers the price.
  const [balanceCents, setBalanceCents] = useState<number | null>(null)
  const [balancePaying, setBalancePaying] = useState(false)

  // Count a view — once per session per repo, but never count the owner viewing
  // their own listing. Runs after the repo loads so the owner is known.
  useEffect(() => {
    if (!id || !repo) return
    if (user?.id === repo.owner_id) return
    const key = `viewed:${id}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch { return }
    createClient().rpc('increment_repo_view', { p_repo: id })
  }, [id, repo, user])

  // Fetch all data
  useEffect(() => {
    if (!id) return
    const supabase = createClient()
    let active = true

    // NOTE: public.users is RLS-restricted to the owner's own row, so we cannot
    // embed owner/reviewer profiles via a FK join (they'd come back null for
    // everyone except the row's owner — e.g. a buyer couldn't see the author).
    // The anon-readable `profiles` view exposes the safe public columns instead.
    async function load() {
      // Main repo
      const { data, error } = await supabase
        .from('repositories')
        .select('*')
        .eq('id', id)
        .single()
      if (!active) return
      if (error || !data) { setLoading(false); return }
      const r = data as Omit<RepoDetail, 'owner'>

      // Owner (from the public profiles view)
      const { data: ownerRaw } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, reputation')
        .eq('id', r.owner_id)
        .maybeSingle()
      if (!active) return
      setRepo({ ...r, owner: (ownerRaw as RepoDetail['owner']) ?? null })
      setLikeCount(r.reaction_count)
      setLoading(false)

      // Reviews (+ reviewer profiles, fetched separately for the same RLS reason)
      const { data: rvRaw } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, verified_purchase, reviewer_id')
        .eq('repository_id', id)
        .order('created_at', { ascending: false })
        .limit(20)
      const reviewRows = (rvRaw as (Omit<ReviewRow, 'reviewer'> & { reviewer_id: string })[] | null) ?? []
      const reviewerIds = [...new Set(reviewRows.map((x) => x.reviewer_id))]
      const reviewerMap = new Map<string, { username: string; avatar_url: string | null }>()
      if (reviewerIds.length > 0) {
        const { data: rp } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', reviewerIds)
        for (const p of (rp as { id: string; username: string; avatar_url: string | null }[] | null) ?? []) {
          reviewerMap.set(p.id, { username: p.username, avatar_url: p.avatar_url })
        }
      }
      if (!active) return
      setReviews(reviewRows.map((x) => ({
        id: x.id,
        rating: x.rating,
        comment: x.comment,
        created_at: x.created_at,
        verified_purchase: x.verified_purchase,
        reviewer: reviewerMap.get(x.reviewer_id) ?? null,
      })))

      // Version history
      const { data: vs } = await supabase
        .from('repository_versions')
        .select('*')
        .eq('repository_id', id)
        .order('created_at', { ascending: false })
      if (!active) return
      setVersions((vs as RepositoryVersion[] | null) ?? [])

      // Similar (same tags, exclude self) + owner usernames
      if (r.tags.length > 0) {
        const { data: simRaw } = await supabase
          .from('repositories')
          .select('id, title, slug, type, price_cents, category, tags, owner_id')
          .eq('is_published', true)
          .neq('id', id)
          .overlaps('tags', r.tags)
          .limit(3)
        const simRows = (simRaw as (Omit<SimilarRepo, 'owner'> & { owner_id: string })[] | null) ?? []
        const simOwnerIds = [...new Set(simRows.map((x) => x.owner_id))]
        const simOwnerMap = new Map<string, string>()
        if (simOwnerIds.length > 0) {
          const { data: sp } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', simOwnerIds)
          for (const p of (sp as { id: string; username: string }[] | null) ?? []) {
            simOwnerMap.set(p.id, p.username)
          }
        }
        if (!active) return
        setSimilar(simRows.map((x) => ({
          id: x.id,
          title: x.title,
          slug: x.slug,
          type: x.type,
          price_cents: x.price_cents,
          category: x.category,
          tags: x.tags,
          owner: simOwnerMap.has(x.owner_id) ? { username: simOwnerMap.get(x.owner_id)! } : null,
        })))
      }
    }

    load()
    return () => { active = false }
  }, [id])

  // Check whether the current user may review (has a completed purchase, no prior review).
  // The review form is gated on `user` in render, so we don't need to reset
  // synchronously when there's no user — async results overwrite on next sign-in.
  useEffect(() => {
    if (!id || !user) return
    const supabase = createClient()
    let active = true

    supabase
      .from('purchases')
      .select('id, escrow_status, release_at')
      .eq('repository_id', id)
      .eq('buyer_id', user.id)
      .eq('status', 'completed')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        const purchase = data as { id: string; escrow_status: string | null; release_at: string | null } | null
        setPurchaseId(purchase?.id ?? null)
        setEscrowStatus(purchase?.escrow_status ?? null)
        setReleaseAt(purchase?.release_at ?? null)
      })

    supabase
      .from('reviews')
      .select('id')
      .eq('repository_id', id)
      .eq('reviewer_id', user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (active) setHasReviewed(Boolean(data)) })

    supabase.rpc('is_staff').then(({ data }) => { if (active) setIsStaff(Boolean(data)) })

    supabase
      .from('reactions')
      .select('id')
      .eq('repository_id', id)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (active) setLiked(Boolean(data)) })

    supabase
      .from('users')
      .select('balance_cents')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (active) setBalanceCents((data as { balance_cents: number } | null)?.balance_cents ?? 0) })

    return () => { active = false }
  }, [id, user])

  async function setEscrow(next: 'released' | 'disputed') {
    if (!purchaseId || escrowBusy) return
    if (next === 'released' && !window.confirm('Release the payment to the seller? Do this once you have what you paid for.')) return
    setEscrowBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('purchases').update({ escrow_status: next }).eq('id', purchaseId)
    setEscrowBusy(false)
    if (error) { toast.error('Could not update', error.message); return }
    setEscrowStatus(next)
    if (next === 'released') toast.success('Released to the seller', 'Thanks for confirming.')
    else toast.info('Dispute opened', 'A moderator will review it.')
  }

  async function handleBuy() {
    if (!user) { router.push('/auth'); return }
    if (!repo || buying) return
    setBuying(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ repositoryId: repo.id }),
      })
      const json = await res.json()
      if (json.alreadyOwned) {
        toast.info('Already purchased', 'You already own this project.')
        setPurchaseId('owned'); router.refresh(); setBuying(false); return
      }
      if (json.url) { window.location.href = json.url; return } // → NOWPayments invoice
      toast.error('Checkout unavailable', json.error ?? 'Please try again later.')
    } catch {
      toast.error('Checkout failed', 'Please try again later.')
    }
    setBuying(false)
  }

  // Pay from the internal balance (only offered when it covers the price).
  async function handleBalanceBuy() {
    if (!user) { router.push('/auth'); return }
    if (!repo || balancePaying) return
    setBalancePaying(true)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('purchase_with_balance', { p_repository_id: repo.id })
    setBalancePaying(false)
    if (error) { toast.error('Payment failed', error.message); return }
    setPurchaseId((data as string) ?? 'owned')
    setEscrowStatus('held')
    setBalanceCents((c) => (c != null ? c - (repo.price_cents ?? 0) : c))
    toast.success('Purchased with balance', 'Enjoy your new project!')
    router.refresh()
  }

  // Downloads go through our branded route (vydex.dev/api/download/…), which
  // redirects to a short-lived signed URL. Storage RLS still enforces access.
  function handleDownload() {
    if (!repo?.storage_path) {
      toast.error('File not available', 'The author has not uploaded a file yet.')
      return
    }
    if (!user) { router.push('/auth'); return }
    window.open(`/api/download/${repo.id}`, '_blank')
    toast.success('Download started!')
  }

  function downloadVersion(versionId: string) {
    if (!user) { router.push('/auth'); return }
    if (!repo) return
    window.open(`/api/download/${repo.id}?v=${versionId}`, '_blank')
    toast.success('Download started!')
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !repo) { router.push('/auth'); return }
    if (!comment.trim()) return
    if (containsBanned(comment)) { toast.error('Not allowed', BANNED_MESSAGE); return }
    setSubmitting(true)

    const supabase = createClient()

    // Need a "purchase" to review. Paid → must be bought. Free → mint a $0
    // access record server-side (RPC validates the repo is actually free).
    let pid = purchaseId
    if (!pid) {
      if (repo.type !== 'free') {
        setSubmitting(false)
        toast.info('Reviews require a purchase', 'You can review this project after buying it.')
        return
      }
      const { data: claimed, error: claimErr } = await supabase.rpc('claim_free_repo', { p_repository_id: repo.id })
      if (claimErr || !claimed) {
        setSubmitting(false)
        toast.error('Could not post review', claimErr?.message ?? 'Please try again.')
        return
      }
      pid = claimed as string
      setPurchaseId(pid)
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        purchase_id: pid,
        repository_id: repo.id,
        reviewer_id: user.id,
        rating,
        comment: comment.trim(),
      })
      .select('id, rating, comment, created_at, verified_purchase')
      .single()

    setSubmitting(false)

    if (error || !data) {
      toast.error('Could not post review', error?.message ?? 'Please try again.')
      return
    }

    const inserted = data as { id: string; rating: number; comment: string | null; created_at: string; verified_purchase: boolean }
    setReviews((prev) => [
      { ...inserted, reviewer: { username: user.username, avatar_url: user.avatarUrl } },
      ...prev,
    ])
    setComment('')
    setHasReviewed(true)
    toast.success('Review posted!', 'Thanks for sharing your feedback.')
  }

  async function toggleLike() {
    if (!user) { router.push('/auth'); return }
    if (!repo || likeBusy) return
    setLikeBusy(true)

    const supabase = createClient()
    const next = !liked
    // optimistic
    setLiked(next)
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)))

    const { error } = next
      ? await supabase.from('reactions').insert({ repository_id: repo.id, user_id: user.id })
      : await supabase.from('reactions').delete().eq('repository_id', repo.id).eq('user_id', user.id)

    if (error) {
      // revert
      setLiked(!next)
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)))
      toast.error('Could not update like', error.message)
    }
    setLikeBusy(false)
  }

  async function handleFork() {
    if (!user) { router.push('/auth'); return }
    if (!repo || forking) return
    // Forkable when you actually have the source: free, owner, or purchased.
    if (repo.type !== 'free' && !isOwner && !purchaseId) {
      toast.info('Fork after purchase', 'Paid repositories can be forked once purchased.')
      return
    }
    if (!repo.storage_path) {
      toast.error('Nothing to fork', 'This repository has no source file yet.')
      return
    }
    setForking(true)

    const supabase = createClient()
    const newId = crypto.randomUUID()
    const newPath = `${user.id}/${newId}/source.zip`

    // Copy the source within the private bucket (RLS: read source as a free
    // published repo, write into your own folder).
    const { error: copyErr } = await supabase.storage.from('repositories').copy(repo.storage_path, newPath)
    if (copyErr) { setForking(false); toast.error('Fork failed', copyErr.message); return }

    const { error: insErr } = await supabase.from('repositories').insert({
      id: newId,
      owner_id: user.id,
      title: repo.title,
      slug: `${repo.slug}-fork-${newId.slice(0, 6)}`.slice(0, 80),
      description: repo.description,
      readme: repo.readme,
      // A fork of a paid project stays paid (>= original price) — you can't
      // turn someone else's paid work into a free giveaway. The DB trigger
      // also blocks publishing until the source actually changes.
      type: repo.type,
      price_cents: repo.type === 'paid' ? repo.price_cents : null,
      source_sha256: repo.source_sha256,
      storage_path: newPath,
      tags: repo.tags,
      category: repo.category,
      is_published: false,
    })
    if (insErr) {
      await supabase.storage.from('repositories').remove([newPath])
      setForking(false)
      toast.error('Fork failed', insErr.message)
      return
    }

    // Link the fork — the forks trigger bumps the original's fork_count.
    await supabase.from('forks').insert({
      original_repository_id: repo.id,
      forked_repository_id: newId,
      forked_by: user.id,
    })

    setForking(false)
    toast.success('Forked!', 'A draft copy was added to your projects.')
    router.push(`/explore/new?edit=${newId}`)
  }

  async function handleDelete() {
    if (!user || !repo || (user.id !== repo.owner_id && !isStaff) || deleting) return
    if (!window.confirm('Delete this repository permanently? This cannot be undone.')) return
    setDeleting(true)

    const supabase = createClient()
    // Delete the row FIRST — a trigger blocks deletion of repos with paid buyers.
    // Only remove the file once the row is actually gone.
    const { error } = await supabase.from('repositories').delete().eq('id', repo.id)
    if (error) {
      setDeleting(false)
      toast.error('Could not delete', error.message)
      return
    }
    if (repo.storage_path) {
      await supabase.storage.from('repositories').remove([repo.storage_path])
    }
    setDeleting(false)
    toast.success('Repository deleted')
    router.push('/dashboard')
    router.refresh()
  }

  // Moderator/admin: remove a review (RLS allows staff delete).
  async function deleteReview(reviewId: string) {
    if (!window.confirm('Delete this review?')) return
    const supabase = createClient()
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId)
    if (error) { toast.error('Could not delete', error.message); return }
    setReviews((prev) => prev.filter((r) => r.id !== reviewId))
    toast.success('Review removed')
  }

  // ─── Loading skeleton ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
          <div className="mb-6 h-4 w-48 animate-pulse bg-secondary" />
          <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
            <div className="flex flex-col gap-4">
              <div className="h-8 w-3/4 animate-pulse bg-secondary" />
              <div className="h-40 animate-pulse bg-card border-2 border-border" />
            </div>
            <div className="h-64 animate-pulse bg-card border-2 border-border" />
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  if (!repo) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="grid flex-1 place-items-center px-4">
          <div className="text-center">
            <p className="font-pixel text-xs text-muted-foreground">Repository not found.</p>
            <Link href="/explore" className="mt-4 block font-mono text-sm text-primary hover:underline">← Back to explore</Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  const isPaid     = repo.type === 'paid'
  const price      = repo.price_cents ? `$${(repo.price_cents / 100).toFixed(2)}` : 'Free'
  const categoryIcon = CATEGORY_ICONS[repo.category ?? ''] ?? '▢'
  const isOwner    = user?.id === repo.owner_id
  const canPayBalance = isPaid && balanceCents != null && (repo.price_cents ?? 0) > 0 && balanceCents >= (repo.price_cents ?? 0)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">

        {/* Breadcrumb */}
        <nav className="mb-8 font-mono text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">~</Link>
          {' / '}
          <Link href="/explore" className="hover:text-primary">explore</Link>
          {' / '}
          <span className="text-foreground truncate">{repo.title}</span>
        </nav>

        {/* Two-column layout */}
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">

          {/* ── Left column ──────────────────────────────────────────────── */}
          <div className="min-w-0">

            {/* Title + meta */}
            <div className="flex items-start gap-4">
              <span className="hidden sm:grid h-14 w-14 shrink-0 place-items-center border-2 border-border bg-secondary font-pixel text-2xl text-primary">
                {categoryIcon}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {repo.category && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {repo.category.replace('-', ' ')}
                    </span>
                  )}
                  {!repo.is_published && (
                    <span className="border border-border px-2 py-0.5 font-pixel text-[9px] text-muted-foreground">draft</span>
                  )}
                </div>
                <h1 className="mt-1 break-words font-pixel text-sm leading-relaxed">{repo.title}</h1>

                {(repo.ai_signals?.length ?? 0) > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-2 border-primary/40 bg-primary/5 px-3 py-2">
                    <span className="flex items-center gap-1.5 font-pixel text-[9px] uppercase tracking-wider text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      AI-built
                    </span>
                    {repo.ai_signals!.map((s) => (
                      <span key={s} className="border border-primary/40 bg-background px-2 py-0.5 font-mono text-[10px] text-primary">{s}</span>
                    ))}
                    <span className="group/info relative ml-auto cursor-help">
                      <Info className="h-3.5 w-3.5 text-muted-foreground/50 transition-colors group-hover/info:text-primary" />
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute right-0 top-6 z-20 w-64 border-2 border-border bg-card px-3 py-2 text-left font-mono text-[10px] normal-case leading-relaxed tracking-normal text-muted-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover/info:opacity-100"
                      >
                        Detected from AI-tool footprints found in the uploaded archive (config / sandbox files). Heuristic clues — not proof of authorship.
                      </span>
                    </span>
                  </div>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-4 font-mono text-[10px] text-muted-foreground">
                  {repo.average_rating > 0 && (
                    <span className="flex items-center gap-1">
                      <StarRating value={repo.average_rating} />
                      <span>{repo.average_rating.toFixed(1)}</span>
                      <span>({repo.review_count})</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />{repo.view_count} views
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />{likeCount} likes
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="h-3 w-3" />{repo.fork_count} forks
                  </span>
                  {repo.purchase_count > 0 && (
                    <span className="flex items-center gap-1 text-green-400">
                      <ShoppingCart className="h-3 w-3" />
                      {repo.purchase_count} {repo.type === 'free' ? 'downloads' : 'sold'}
                    </span>
                  )}
                  {repo.published_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{formatDate(repo.published_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Preview — demo + screenshots so buyers see what they're getting */}
            {(repo.demo_url || (repo.preview_images?.length ?? 0) > 0) && (
              <div className="mt-6">
                {repo.demo_url && (
                  <a
                    href={repo.demo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-4 inline-flex items-center gap-2 border-2 border-primary bg-primary px-4 py-2.5 font-pixel text-[10px] uppercase tracking-wider text-primary-foreground pixel-shadow-border transition-all duration-100 hover:brightness-110 active:translate-x-1 active:translate-y-1 active:shadow-none"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open live demo
                  </a>
                )}
                {(repo.preview_images?.length ?? 0) > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {repo.preview_images!.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative block aspect-video overflow-hidden border-2 border-border bg-secondary transition-colors hover:border-primary"
                      >
                        <Image src={url} alt={`${repo.title} preview ${i + 1}`} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {repo.description && (
              <div className="mt-6 border-2 border-border bg-card p-5">
                <p className="text-sm leading-relaxed text-foreground">{repo.description}</p>
              </div>
            )}

            {/* README / long description */}
            {repo.readme && (
              <div className="mt-4 border-2 border-border bg-card p-5">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">README</p>
                <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground/80">{repo.readme}</pre>
              </div>
            )}

            {/* Heuristic security scan flags */}
            {(repo.security_flags?.length ?? 0) > 0 && (
              <div className="mt-10">
                <h2 className="flex items-center gap-2 font-pixel text-[10px] uppercase tracking-wider">
                  Security scan
                  <span className="font-mono normal-case text-muted-foreground">({repo.security_flags!.length})</span>
                </h2>
                <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                  Heuristic flags from a static scan of the code — not a virus scan and not proof of anything. Review before buying.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {repo.security_flags!.map((id) => {
                    const rule = SECURITY_CATALOG[id]
                    if (!rule) return null
                    return (
                      <div key={id} className={'border-2 px-3 py-2 ' + SEVERITY_STYLE[rule.severity]}>
                        <p className="font-pixel text-[9px] uppercase tracking-wider">{rule.severity} · {rule.label}</p>
                        <p className="mt-1 font-mono text-[10px] leading-relaxed opacity-90">{rule.description}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Dependency vulnerabilities (OSV.dev) */}
            {(repo.vuln_findings?.length ?? 0) > 0 && (
              <div className="mt-10">
                <h2 className="flex items-center gap-2 font-pixel text-[10px] uppercase tracking-wider">
                  Dependency vulnerabilities
                  <span className="font-mono normal-case text-muted-foreground">({repo.vuln_findings!.length})</span>
                </h2>
                <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                  Known advisories in the project&apos;s dependencies (source: OSV.dev).
                </p>
                <div className="mt-4 flex flex-col gap-1.5">
                  {repo.vuln_findings!.map((v) => (
                    <div key={v} className="border-2 border-amber-400/50 bg-amber-400/10 px-3 py-1.5 font-mono text-[10px] text-amber-400"><VulnFinding text={v} /></div>
                  ))}
                </div>
              </div>
            )}

            {/* Files — tree for everyone; contents for free/owner/purchased */}
            <RepoFiles
              manifest={repo.file_manifest ?? []}
              storagePath={repo.storage_path}
              canView={Boolean(user) && (isOwner || isStaff || repo.type === 'free' || Boolean(purchaseId))}
              lockedLabel={!user ? 'Sign in to view' : 'Purchase to view'}
            />

            {/* Tags */}
            {repo.tags.length > 0 && (
              <div className="mt-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  {repo.tags.map((t) => (
                    <Link
                      key={t}
                      href={`/explore?q=${encodeURIComponent(t)}`}
                      className="border border-border bg-secondary px-3 py-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      {t}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* GitHub link */}
            {repo.github_url && (
              <div className="mt-5">
                <a
                  href={repo.github_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View on GitHub
                </a>
              </div>
            )}

            {/* ── Version history ───────────────────────────────────────── */}
            {versions.length > 0 && (
              <div className="mt-10">
                <h2 className="flex items-center gap-2 font-pixel text-[10px] uppercase tracking-wider">
                  <History className="h-3.5 w-3.5" />
                  Versions
                  <span className="font-mono text-muted-foreground">({versions.length})</span>
                </h2>
                <div className="mt-4 flex flex-col gap-3">
                  {versions.map((v, i) => (
                    <div key={v.id} className="border-2 border-border bg-card p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-pixel text-[10px] text-primary">
                          {v.version}
                          {i === 0 && <span className="ml-2 font-mono text-[9px] text-green-400">latest</span>}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] text-muted-foreground">{formatDate(v.created_at)}</span>
                          <button
                            type="button"
                            onClick={() => downloadVersion(v.id)}
                            className="text-muted-foreground transition-colors hover:text-primary"
                            aria-label={`Download ${v.version}`}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {v.changelog && (
                        <p className="mt-2 whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">{v.changelog}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Reviews / Comments ───────────────────────────────────── */}
            <div className="mt-10">
              <h2 className="font-pixel text-[10px] uppercase tracking-wider">
                Reviews
                {reviews.length > 0 && <span className="ml-2 font-mono text-muted-foreground">({reviews.length})</span>}
              </h2>

              {reviews.length === 0 ? (
                <div className="mt-4 border-2 border-dashed border-border p-8 text-center">
                  <Star className="mx-auto mb-3 h-8 w-8 text-muted-foreground/20" />
                  <p className="font-mono text-xs text-muted-foreground">No reviews yet. Be the first!</p>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {reviews.map((rv) => (
                    <div key={rv.id} className="border-2 border-border bg-card p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <PixelAvatar
                            username={rv.reviewer?.username ?? '?'}
                            avatarColor={colorFromId(rv.id)}
                            size={24}
                          />
                          <span className="font-mono text-xs text-foreground">
                            @{rv.reviewer?.username ?? 'anonymous'}
                          </span>
                          {rv.verified_purchase ? (
                            <span className="inline-flex items-center gap-1 border border-green-400/40 bg-green-400/10 px-1.5 py-0.5 font-pixel text-[7px] uppercase tracking-wider text-green-400">
                              ✓ verified buyer
                            </span>
                          ) : (
                            <span className="border border-border bg-secondary px-1.5 py-0.5 font-pixel text-[7px] uppercase tracking-wider text-muted-foreground">
                              free copy
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <StarRating value={rv.rating} />
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {formatDate(rv.created_at)}
                          </span>
                          {isStaff && (
                            <button
                              type="button"
                              onClick={() => deleteReview(rv.id)}
                              aria-label="Delete review (moderator)"
                              className="text-muted-foreground transition-colors hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      {rv.comment && (
                        <p className="mt-3 font-mono text-xs leading-relaxed text-muted-foreground">{rv.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Review form — buyers (paid) or any signed-in user (free), once each */}
              {user && !isOwner && !hasReviewed && (purchaseId || repo.type === 'free') && (
                <form onSubmit={handleReview} className="mt-4 border-2 border-border bg-card p-4">
                  <p className="mb-3 font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">Leave a review</p>

                  {/* Star picker (isolated so hover doesn't re-render the page) */}
                  <ReviewStars value={rating} onChange={setRating} />

                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your experience with this project…"
                      className="flex-1 resize-none border-2 border-input bg-background px-3 py-2 font-mono text-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
                    />
                    <PixelButton type="submit" disabled={submitting} className="shrink-0 px-3">
                      <Send className="h-3.5 w-3.5" />
                    </PixelButton>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* ── Right sidebar ──────────────────────────────────────────── */}
          <aside className="flex flex-col gap-4">

            {/* Price + CTA */}
            <div className="border-2 border-border bg-card p-5 pixel-shadow-border">
              <div className="flex items-baseline justify-between">
                <span className="font-pixel text-xl text-primary">{price}</span>
                {isPaid && <span className="font-mono text-[10px] text-muted-foreground">one-time</span>}
              </div>

              <div className="mt-5 flex flex-col gap-2">
                {isPaid ? (
                  purchaseId ? (
                    <PixelButton className="w-full py-3 gap-2" onClick={handleDownload}>
                      <Download className="h-4 w-4" />
                      Download
                    </PixelButton>
                  ) : canPayBalance ? (
                    <div className="flex flex-col gap-2">
                      <PixelButton className="w-full py-3 gap-2" onClick={handleBalanceBuy} disabled={balancePaying}>
                        <Wallet className="h-4 w-4" />
                        {balancePaying ? 'Paying…' : `Pay with balance · ${price}`}
                      </PixelButton>
                      <PixelButton variant="outline" className="w-full gap-2 py-2.5 text-xs" onClick={handleBuy} disabled={buying}>
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {buying ? 'Redirecting…' : 'Pay with crypto'}
                      </PixelButton>
                    </div>
                  ) : (
                    <PixelButton className="w-full py-3 gap-2" onClick={handleBuy} disabled={buying}>
                      <ShoppingCart className="h-4 w-4" />
                      {buying ? 'Redirecting…' : 'Buy now'}
                    </PixelButton>
                  )
                ) : (
                  <PixelButton className="w-full py-3 gap-2" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                    Download free
                  </PixelButton>
                )}
                {!isOwner && (
                  <div className="flex gap-2">
                    <PixelButton
                      variant="outline"
                      className="flex-1 gap-1.5 py-2.5 text-xs"
                      onClick={toggleLike}
                      disabled={likeBusy}
                    >
                      <Heart className={'h-3.5 w-3.5 ' + (liked ? 'fill-current text-destructive' : '')} />
                      {likeCount}
                    </PixelButton>
                    <PixelButton
                      variant="outline"
                      className="flex-1 gap-1.5 py-2.5 text-xs"
                      onClick={handleFork}
                      disabled={forking}
                    >
                      <GitFork className="h-3.5 w-3.5" />
                      {forking ? '…' : 'Fork'}
                    </PixelButton>
                  </div>
                )}

                {isOwner && (
                  <PixelButton variant="outline" className="w-full py-2.5 text-xs" onClick={() => router.push(`/explore/new?edit=${repo.id}`)}>
                    Edit listing
                  </PixelButton>
                )}
                {(isOwner || isStaff) && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex w-full items-center justify-center gap-1.5 border-2 border-destructive bg-destructive/5 px-5 py-2.5 font-pixel text-[10px] uppercase leading-none tracking-wider text-destructive transition-all duration-100 [box-shadow:3px_3px_0_0_var(--destructive)] hover:bg-destructive hover:text-white active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deleting ? 'Deleting…' : (isOwner ? 'Delete' : 'Delete (mod)')}
                  </button>
                )}
              </div>

              {/* Escrow (buyer of a paid repo) */}
              {!isOwner && purchaseId && escrowStatus && (
                <div className="mt-5 border-t border-border pt-4">
                  {escrowStatus === 'held' ? (
                    <>
                      <p className="font-pixel text-[9px] uppercase tracking-wider text-amber-400">🔒 Payment in escrow</p>
                      <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                        The seller is paid only after you confirm{releaseAt ? `, or automatically on ${formatDate(releaseAt)}` : ''}.
                      </p>
                      <div className="mt-3 flex flex-col gap-2">
                        <PixelButton className="w-full py-2.5 text-xs" disabled={escrowBusy} onClick={() => setEscrow('released')}>
                          Confirm & release
                        </PixelButton>
                        <button
                          type="button"
                          onClick={() => setEscrow('disputed')}
                          disabled={escrowBusy}
                          className="w-full border-2 border-border px-4 py-2 font-pixel text-[9px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-60"
                        >
                          Open a dispute
                        </button>
                      </div>
                    </>
                  ) : escrowStatus === 'released' ? (
                    <p className="font-pixel text-[9px] uppercase tracking-wider text-green-400">✓ Released to the seller</p>
                  ) : escrowStatus === 'disputed' ? (
                    <p className="font-pixel text-[9px] uppercase tracking-wider text-amber-400">⚖ Under review by a moderator</p>
                  ) : (
                    <p className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">↩ Refunded</p>
                  )}
                </div>
              )}

              {/* Stats row */}
              <div className="mt-5 grid grid-cols-4 gap-0 border-t border-border pt-4 text-center">
                <div>
                  <p className="font-pixel text-[10px] text-primary">{likeCount}</p>
                  <p className="mt-1 font-mono text-[9px] text-muted-foreground">likes</p>
                </div>
                <div className="border-l border-border">
                  <p className="font-pixel text-[10px] text-primary">{repo.fork_count}</p>
                  <p className="mt-1 font-mono text-[9px] text-muted-foreground">forks</p>
                </div>
                <div className="border-l border-border">
                  <p className="font-pixel text-[10px] text-primary">{repo.review_count}</p>
                  <p className="mt-1 font-mono text-[9px] text-muted-foreground">reviews</p>
                </div>
                <div className="border-l border-border">
                  <p className="font-pixel text-[10px] text-green-400">{repo.purchase_count}</p>
                  <p className="mt-1 font-mono text-[9px] text-muted-foreground">{repo.type === 'free' ? 'gets' : 'sold'}</p>
                </div>
              </div>
            </div>

            {/* Author */}
            {repo.owner && (
              <div className="border-2 border-border bg-card p-5">
                <p className="mb-3 font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">Author</p>
                <Link
                  href={`/u/${repo.owner.username}`}
                  className="group flex items-center gap-3 transition-colors hover:text-primary"
                >
                  <PixelAvatar
                    username={repo.owner.username}
                    avatarColor={colorFromId(repo.owner.id)}
                    size={40}
                    imageUrl={repo.owner.avatar_url ?? undefined}
                    className="!border-2 shrink-0"
                  />
                  <div>
                    <p className="font-mono text-sm text-foreground group-hover:text-primary">
                      {repo.owner.display_name ?? repo.owner.username}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">@{repo.owner.username}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {repo.owner.reputation} reputation
                    </p>
                  </div>
                </Link>
              </div>
            )}

            {/* Published date */}
            <div className="border-2 border-border bg-card px-5 py-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground">Published</span>
                <span className="font-mono text-[10px] text-foreground">
                  {repo.published_at ? formatDate(repo.published_at) : formatDate(repo.created_at)}
                </span>
              </div>
              {repo.category && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">Category</span>
                  <span className="font-mono text-[10px] text-foreground capitalize">{repo.category.replace('-', ' ')}</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground">Type</span>
                <span className={`font-pixel text-[9px] ${isPaid ? 'text-primary' : 'text-green-400'}`}>
                  {isPaid ? 'Paid' : 'Free'}
                </span>
              </div>
            </div>
          </aside>
        </div>

        {/* ── Similar projects ─────────────────────────────────────────────── */}
        {similar.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-5 font-pixel text-[10px] uppercase tracking-wider">Similar projects</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((s) => (
                <Link
                  key={s.id}
                  href={s.owner ? `/${s.owner.username}/${s.slug}` : `/listing/${s.id}`}
                  className="group flex flex-col gap-3 border-2 border-border bg-card p-4 transition-all duration-100 hover:border-primary hover:pixel-shadow-border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center border border-border bg-secondary font-pixel text-sm text-primary">
                      {CATEGORY_ICONS[s.category ?? ''] ?? '▢'}
                    </span>
                    <span className="border border-green-400/50 bg-green-400/10 px-2 py-0.5 font-pixel text-[9px] text-green-400">
                      {s.type === 'free' ? 'Free' : s.price_cents ? `$${(s.price_cents / 100).toFixed(0)}` : 'Paid'}
                    </span>
                  </div>
                  <div>
                    <p className="font-mono text-sm text-foreground group-hover:text-primary line-clamp-1">{s.title}</p>
                    {s.owner && (
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">@{s.owner.username}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.tags.slice(0, 3).map((t) => (
                      <span key={t} className="border border-border bg-secondary px-2 py-0.5 font-mono text-[9px] text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </main>

      <SiteFooter />
    </div>
  )
}
