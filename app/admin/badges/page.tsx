'use client'

import { useState } from 'react'
import { Award, Search, X } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/components/pixel-toast'
import { createClient } from '@/lib/supabase/client'
import { MANUAL_BADGES, MANUAL_BADGE_KEYS } from '@/lib/badges'

interface Target {
  id: string
  username: string
  badges: string[]
}

export default function AdminBadgesPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [target, setTarget] = useState<Target | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [picked, setPicked] = useState(MANUAL_BADGE_KEYS[0])
  const [busy, setBusy] = useState(false)

  async function load(e: React.FormEvent) {
    e.preventDefault()
    const uname = query.trim().replace(/^@/, '')
    if (!uname) return
    setLoading(true)
    setNotFound(false)
    setTarget(null)
    const supabase = createClient()
    const { data: prof } = await supabase.from('profiles').select('id, username').eq('username', uname).maybeSingle()
    if (!prof) { setNotFound(true); setLoading(false); return }
    const p = prof as { id: string; username: string }
    const { data: rows } = await supabase.from('account_badges').select('badge').eq('user_id', p.id)
    setTarget({ id: p.id, username: p.username, badges: ((rows as { badge: string }[] | null) ?? []).map((r) => r.badge) })
    setLoading(false)
  }

  async function grant() {
    if (!target || target.badges.includes(picked)) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('account_badges').insert({ user_id: target.id, badge: picked, granted_by: user?.id ?? null })
    setBusy(false)
    if (error) { toast.error('Could not grant', error.message); return }
    setTarget({ ...target, badges: [...target.badges, picked] })
    toast.success('Badge granted', `${MANUAL_BADGES[picked]?.label ?? picked} → @${target.username}`)
  }

  async function revoke(badge: string) {
    if (!target) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('account_badges').delete().eq('user_id', target.id).eq('badge', badge)
    setBusy(false)
    if (error) { toast.error('Could not revoke', error.message); return }
    setTarget({ ...target, badges: target.badges.filter((b) => b !== badge) })
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Award className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-pixel text-xs uppercase tracking-wider">Badges</h2>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            Assign partner / special badges. Achievement badges (Early Adopter, Creator…) are awarded automatically.
          </p>
        </div>
      </div>

      {/* Find a user */}
      <form onSubmit={load} className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="username"
            className="w-full border-2 border-border bg-card py-3 pl-11 pr-4 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
        <button type="submit" disabled={loading} className="border-2 border-primary bg-primary px-5 font-pixel text-[10px] uppercase tracking-wider text-primary-foreground disabled:opacity-60">
          {loading ? '…' : 'Find'}
        </button>
      </form>

      {notFound && <p className="font-mono text-sm text-muted-foreground">No user with that username.</p>}

      {target && (
        <div className="border-2 border-border bg-card p-5">
          <p className="font-mono text-sm text-foreground">@{target.username}</p>

          <p className="mt-4 font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">Current badges</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {target.badges.length === 0 && <span className="font-mono text-xs text-muted-foreground/60">none</span>}
            {target.badges.map((b) => (
              <span key={b} className={`inline-flex items-center gap-1.5 border px-2.5 py-1 font-pixel text-[9px] uppercase tracking-wider ${MANUAL_BADGES[b]?.className ?? 'border-border text-muted-foreground'}`}>
                {MANUAL_BADGES[b]?.label ?? b}
                <button type="button" onClick={() => revoke(b)} disabled={busy} aria-label="Revoke" className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          <p className="mt-5 font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">Grant a badge</p>
          <div className="mt-2 flex gap-2">
            <select
              value={picked}
              onChange={(e) => setPicked(e.target.value)}
              className="flex-1 border-2 border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
            >
              {MANUAL_BADGE_KEYS.map((k) => (
                <option key={k} value={k}>{MANUAL_BADGES[k].label}</option>
              ))}
            </select>
            <button type="button" onClick={grant} disabled={busy || target.badges.includes(picked)} className="border-2 border-primary bg-primary px-5 font-pixel text-[10px] uppercase tracking-wider text-primary-foreground disabled:opacity-60">
              Grant
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
