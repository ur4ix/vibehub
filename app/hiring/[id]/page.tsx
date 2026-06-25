'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Briefcase, Clock, Users, Trash2, X, Send } from 'lucide-react'
import { PixelAvatar, colorFromId } from '@/components/pixel-avatar'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelButton } from '@/components/pixel-button'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/components/pixel-toast'
import { createClient } from '@/lib/supabase/client'
import { containsBanned, BANNED_MESSAGE } from '@/lib/banned-words'

type BudgetType = 'fixed' | 'equity' | 'hourly'

interface Job {
  id: string
  title: string
  description: string
  budget_type: BudgetType
  budget_value: number
  tags: string[]
  status: 'open' | 'closed'
  applicants_count: number
  owner_id: string
  created_at: string
  owner?: { username: string | null }
}

interface Applicant {
  id: string
  message: string
  created_at: string
  applicant: { username: string; avatar_url: string | null } | null
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

export default function JobDetailPage() {
  const { id }     = useParams<{ id: string }>()
  const router     = useRouter()
  const { user }   = useAuth()
  const toast      = useToast()

  const [job,         setJob]         = useState<Job | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [deleting,    setDeleting]    = useState(false)
  const [closing,     setClosing]     = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)
  // Apply flow
  const [applied,     setApplied]     = useState(false)
  const [showApply,   setShowApply]   = useState(false)
  const [applyMsg,    setApplyMsg]    = useState('')
  const [applying,    setApplying]    = useState(false)
  const [applicants,  setApplicants]  = useState<Applicant[]>([])
  const [isStaff,     setIsStaff]     = useState(false)

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
      const { data } = await supabase.from('jobs').select('*').eq('id', id).single()
      const j = data as Job | null
      if (j) {
        // Owner from the public `profiles` view (users is RLS-restricted to self).
        const { data: prof } = await supabase.from('profiles').select('username').eq('id', j.owner_id).maybeSingle()
        j.owner = { username: (prof as { username: string } | null)?.username ?? null }
      }
      setJob(j)
      setLoading(false)
    }
    load()
  }, [id])

  // Has the current user already applied?
  useEffect(() => {
    if (!id || !user) return
    const supabase = createClient()
    let active = true
    supabase
      .from('job_applications')
      .select('id')
      .eq('job_id', id)
      .eq('applicant_id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (active) setApplied(Boolean(data)) })
    return () => { active = false }
  }, [id, user])

  // Owner: load applicants (with their public profiles).
  useEffect(() => {
    if (!job || !user || user.id !== job.owner_id) return
    const supabase = createClient()
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('job_applications')
        .select('id, applicant_id, message, created_at')
        .eq('job_id', job.id)
        .order('created_at', { ascending: false })
      const rows = (data as { id: string; applicant_id: string; message: string; created_at: string }[] | null) ?? []
      const ids = [...new Set(rows.map((r) => r.applicant_id))]
      const map = new Map<string, { username: string; avatar_url: string | null }>()
      if (ids.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, username, avatar_url').in('id', ids)
        for (const p of (profs as { id: string; username: string; avatar_url: string | null }[] | null) ?? []) {
          map.set(p.id, { username: p.username, avatar_url: p.avatar_url })
        }
      }
      if (!active) return
      setApplicants(rows.map((r) => ({
        id: r.id, message: r.message, created_at: r.created_at,
        applicant: map.get(r.applicant_id) ?? null,
      })))
    })()
    return () => { active = false }
  }, [job, user])

  async function handleApply(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { router.push('/auth'); return }
    if (!applyMsg.trim() || applying) return
    if (containsBanned(applyMsg)) { toast.error('Not allowed', BANNED_MESSAGE); return }
    setApplying(true)
    const supabase = createClient()
    const { error } = await supabase.from('job_applications').insert({
      job_id: id, applicant_id: user.id, message: applyMsg.trim(),
    })
    setApplying(false)
    if (error) {
      toast.error('Could not apply', error.message)
      return
    }
    setApplied(true)
    setShowApply(false)
    setApplyMsg('')
    setJob((j) => j ? { ...j, applicants_count: j.applicants_count + 1 } : j)
    toast.success('Application sent!', 'The poster has been notified.')
  }

  const isOwner = user && job && user.id === job.owner_id

  async function handleDelete() {
    if (!confirmDel) { setConfirmDel(true); return }
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (error) {
      toast.error('Delete failed', error.message)
      setDeleting(false)
      setConfirmDel(false)
      return
    }
    toast.success('Job deleted')
    router.push('/hiring')
  }

  async function handleClose() {
    setClosing(true)
    const supabase = createClient()
    const { error } = await supabase.from('jobs').update({ status: 'closed' }).eq('id', id)
    if (error) {
      toast.error('Failed to close job', error.message)
    } else {
      toast.info('Job marked as closed')
      setJob((j) => j ? { ...j, status: 'closed' } : j)
    }
    setClosing(false)
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

  if (!job) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="grid flex-1 place-items-center px-4">
          <div className="text-center">
            <p className="font-pixel text-xs text-muted-foreground">Job not found.</p>
            <Link href="/hiring" className="mt-4 block font-mono text-sm text-primary hover:underline">← Back to hiring board</Link>
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
          <Link href="/hiring" className="hover:text-primary">hiring</Link>
          {' / '}
          <span className="truncate text-foreground">{job.title.slice(0, 40)}{job.title.length > 40 ? '…' : ''}</span>
        </nav>

        {/* Main card */}
        <div className="border-2 border-border bg-card p-6 pixel-shadow-border sm:p-8">
          {/* Header row */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-border bg-background text-muted-foreground">
                <Briefcase className="h-4 w-4" />
              </span>
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">job</span>
                {job.status === 'closed' && (
                  <span className="ml-2 border border-border px-2 py-0.5 font-pixel text-[9px] uppercase text-muted-foreground">closed</span>
                )}
              </div>
            </div>
            <span className={`border-2 px-4 py-1.5 font-pixel text-[10px] whitespace-nowrap ${BUDGET_COLORS[job.budget_type]}`}>
              {BUDGET_LABELS[job.budget_type](job.budget_value)}
            </span>
          </div>

          <h1 className="mt-5 font-pixel text-sm leading-relaxed">{job.title}</h1>

          {/* Meta */}
          <div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-[10px] text-muted-foreground">
            {job.owner?.username && (
              <span>posted by <Link href={`/u/${job.owner.username}`} className="transition-colors hover:text-primary">@{job.owner.username}</Link></span>
            )}
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(job.created_at)}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{job.applicants_count} applicants</span>
          </div>

          {/* Description */}
          <div className="mt-6 border-t border-border pt-6">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Description</p>
            <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground">
              {job.description}
            </p>
          </div>

          {/* Tags */}
          {job.tags.length > 0 && (
            <div className="mt-6 border-t border-border pt-6">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Required skills</p>
              <div className="flex flex-wrap gap-2">
                {job.tags.map((t) => (
                  <span key={t} className="border border-border bg-secondary px-3 py-1.5 font-mono text-[10px] text-muted-foreground">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Owner actions */}
          {(isOwner || isStaff) && (
            <div className="mt-6 border-t border-border pt-6">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{isOwner ? 'Manage' : 'Moderate'}</p>
              <div className="flex flex-wrap gap-3">
                {isOwner && job.status === 'open' && (
                  <PixelButton variant="outline" disabled={closing} onClick={handleClose} className="gap-2">
                    <X className="h-3.5 w-3.5" />
                    {closing ? 'Closing…' : 'Mark as filled'}
                  </PixelButton>
                )}
                <PixelButton
                  variant="outline"
                  disabled={deleting}
                  onClick={handleDelete}
                  className={'gap-2 ' + (confirmDel ? 'border-destructive text-destructive hover:bg-destructive/10' : '')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleting ? 'Deleting…' : confirmDel ? 'Confirm delete?' : 'Delete job'}
                </PixelButton>
                {confirmDel && !deleting && (
                  <button onClick={() => setConfirmDel(false)} className="font-mono text-xs text-muted-foreground hover:text-foreground">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Apply CTA (non-owners) */}
          {!isOwner && job.status === 'open' && (
            <div className="mt-6 border-t border-border pt-6">
              {applied ? (
                <div className="border-2 border-green-400/40 bg-green-400/10 px-4 py-3 text-center font-mono text-xs text-green-400">
                  ✓ You’ve applied to this job
                </div>
              ) : showApply ? (
                <form onSubmit={handleApply}>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Your pitch</p>
                  <textarea
                    rows={4}
                    value={applyMsg}
                    onChange={(e) => setApplyMsg(e.target.value)}
                    placeholder="Introduce yourself and explain why you’re a good fit…"
                    className="w-full resize-none border-2 border-input bg-background px-3 py-2 font-mono text-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
                    autoFocus
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <PixelButton type="submit" disabled={applying || !applyMsg.trim()} className="gap-2 py-2.5">
                      <Send className="h-3.5 w-3.5" />
                      {applying ? 'Sending…' : 'Send application'}
                    </PixelButton>
                    <button type="button" onClick={() => setShowApply(false)} className="font-mono text-xs text-muted-foreground hover:text-foreground">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <PixelButton className="w-full py-3" onClick={() => user ? setShowApply(true) : router.push('/auth')}>
                    Apply for this job
                  </PixelButton>
                  <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
                    Your profile and contact info will be shared with the poster
                  </p>
                </>
              )}
            </div>
          )}

          {/* Applicants (owner only) */}
          {isOwner && (
            <div className="mt-6 border-t border-border pt-6">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Applicants{applicants.length > 0 && <span className="ml-1 text-foreground">({applicants.length})</span>}
              </p>
              {applicants.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">No applications yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {applicants.map((a) => (
                    <div key={a.id} className="border-2 border-border bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <Link
                          href={a.applicant ? `/u/${a.applicant.username}` : '#'}
                          className="group flex items-center gap-2"
                        >
                          <PixelAvatar
                            username={a.applicant?.username ?? '?'}
                            avatarColor={colorFromId(a.id)}
                            size={24}
                            imageUrl={a.applicant?.avatar_url ?? undefined}
                          />
                          <span className="font-mono text-xs text-foreground group-hover:text-primary">
                            @{a.applicant?.username ?? 'unknown'}
                          </span>
                        </Link>
                        <span className="font-mono text-[10px] text-muted-foreground">{timeAgo(a.created_at)}</span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">{a.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6">
          <Link href="/hiring" className="font-mono text-xs text-muted-foreground hover:text-primary">
            ← Back to hiring board
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
