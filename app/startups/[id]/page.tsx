'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Rocket, Globe, Trash2, ExternalLink } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelButton } from '@/components/pixel-button'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/components/pixel-toast'
import { createClient } from '@/lib/supabase/client'

type Stage = 'idea' | 'mvp' | 'launched' | 'revenue' | 'scaling'
type Funding = 'bootstrapped' | 'raising' | 'funded'

interface Startup {
  id: string
  name: string
  tagline: string
  description: string
  website: string | null
  industry: string | null
  stage: Stage
  funding_status: Funding
  raising_amount: number | null
  tags: string[]
  owner_id: string
  created_at: string
  owner?: { username: string | null }
}

const STAGE_LABELS: Record<Stage, string> = {
  idea: 'Idea', mvp: 'MVP', launched: 'Launched', revenue: 'Revenue', scaling: 'Scaling',
}
const STAGE_COLORS: Record<Stage, string> = {
  idea:     'text-muted-foreground border-border bg-secondary',
  mvp:      'text-blue-400 border-blue-400/50 bg-blue-400/10',
  launched: 'text-primary border-primary bg-primary/10',
  revenue:  'text-green-400 border-green-400/50 bg-green-400/10',
  scaling:  'text-amber-400 border-amber-400/50 bg-amber-400/10',
}
const FUNDING_LABELS: Record<Funding, string> = {
  bootstrapped: 'Bootstrapped', raising: 'Raising', funded: 'Funded',
}

export default function StartupDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const { user } = useAuth()
  const toast    = useToast()

  const [startup,    setStartup]    = useState<Startup | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [deleting,   setDeleting]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data } = await supabase.from('startups').select('*').eq('id', id).single()
      const s = data as Startup | null
      if (s) {
        const { data: prof } = await supabase.from('profiles').select('username').eq('id', s.owner_id).maybeSingle()
        s.owner = { username: (prof as { username: string } | null)?.username ?? null }
      }
      setStartup(s)
      setLoading(false)
    }
    load()
  }, [id])

  const isOwner = user && startup && user.id === startup.owner_id

  async function handleDelete() {
    if (!confirmDel) { setConfirmDel(true); return }
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('startups').delete().eq('id', id)
    if (error) { toast.error('Delete failed', error.message); setDeleting(false); setConfirmDel(false); return }
    toast.success('Startup removed')
    router.push('/startups')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
          <div className="h-8 w-48 animate-pulse bg-secondary" />
          <div className="mt-8 h-64 animate-pulse border-2 border-border bg-card" />
        </main>
        <SiteFooter />
      </div>
    )
  }

  if (!startup) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="grid flex-1 place-items-center px-4">
          <div className="text-center">
            <p className="font-pixel text-xs text-muted-foreground">Startup not found.</p>
            <Link href="/startups" className="mt-4 block font-mono text-sm text-primary hover:underline">← Back to startups</Link>
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
        <nav className="mb-8 font-mono text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">~</Link>
          {' / '}
          <Link href="/startups" className="hover:text-primary">startups</Link>
          {' / '}
          <span className="truncate text-foreground">{startup.name}</span>
        </nav>

        <div className="border-2 border-border bg-card p-6 pixel-shadow-border sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-border bg-background text-primary">
                <Rocket className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h1 className="break-words font-pixel text-sm leading-relaxed">{startup.name}</h1>
                {startup.industry && (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{startup.industry}</span>
                )}
              </div>
            </div>
            <span className={`shrink-0 border-2 px-4 py-1.5 font-pixel text-[10px] uppercase tracking-wider ${STAGE_COLORS[startup.stage]}`}>
              {STAGE_LABELS[startup.stage]}
            </span>
          </div>

          <p className="mt-5 text-pretty text-base leading-relaxed text-foreground">{startup.tagline}</p>

          {/* Meta */}
          <div className="mt-5 flex flex-wrap items-center gap-3 font-mono text-[10px] text-muted-foreground">
            <span className={'border px-2 py-1 ' + (startup.funding_status === 'raising' ? 'border-green-400/50 bg-green-400/10 text-green-400' : 'border-border bg-secondary')}>
              {FUNDING_LABELS[startup.funding_status]}
              {startup.funding_status === 'raising' && startup.raising_amount ? ` · raising $${startup.raising_amount.toLocaleString()}` : ''}
            </span>
            {startup.owner?.username && (
              <span>by <Link href={`/u/${startup.owner.username}`} className="transition-colors hover:text-primary">@{startup.owner.username}</Link></span>
            )}
          </div>

          {/* Description */}
          <div className="mt-6 border-t border-border pt-6">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">About</p>
            <p className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-foreground">{startup.description}</p>
          </div>

          {/* Tags */}
          {startup.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {startup.tags.map((t) => (
                <span key={t} className="border border-border bg-secondary px-3 py-1.5 font-mono text-[10px] text-muted-foreground">{t}</span>
              ))}
            </div>
          )}

          {/* Links / contact */}
          <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-6">
            {startup.website && (
              <a href={startup.website} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border-2 border-border px-4 py-2.5 font-pixel text-[10px] uppercase tracking-wider text-foreground transition-colors hover:border-primary hover:text-primary">
                <Globe className="h-3.5 w-3.5" />
                Visit website
              </a>
            )}
            {startup.owner?.username && (
              <Link href={`/u/${startup.owner.username}`}
                className="inline-flex items-center gap-2 border-2 border-primary bg-primary px-4 py-2.5 font-pixel text-[10px] uppercase tracking-wider text-primary-foreground pixel-shadow-border transition-all duration-100 hover:brightness-110 active:translate-x-1 active:translate-y-1 active:shadow-none">
                <ExternalLink className="h-3.5 w-3.5" />
                Contact founder
              </Link>
            )}
          </div>

          {/* Owner actions */}
          {isOwner && (
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-6">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Manage</p>
              <PixelButton variant="outline" disabled={deleting} onClick={handleDelete}
                className={'gap-2 ' + (confirmDel ? 'border-destructive text-destructive hover:bg-destructive/10' : '')}>
                <Trash2 className="h-3.5 w-3.5" />
                {deleting ? 'Removing…' : confirmDel ? 'Confirm remove?' : 'Remove listing'}
              </PixelButton>
              {confirmDel && !deleting && (
                <button onClick={() => setConfirmDel(false)} className="font-mono text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              )}
            </div>
          )}
        </div>

        <div className="mt-6">
          <Link href="/startups" className="font-mono text-xs text-muted-foreground hover:text-primary">← Back to startups</Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
