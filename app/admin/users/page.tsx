'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Check } from 'lucide-react'
import { PixelAvatar, colorFromId } from '@/components/pixel-avatar'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/components/pixel-toast'
import { createClient } from '@/lib/supabase/client'
import type { AppRole } from '@/types/database'

interface Row {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  reputation: number
  created_at: string
  roles: AppRole[]
}

const ALL_ROLES: AppRole[] = ['admin', 'author', 'investor', 'partner']

const ROLE_STYLE: Record<AppRole, string> = {
  admin:    'border-primary bg-primary/10 text-primary',
  author:   'border-blue-400/50 bg-blue-400/10 text-blue-400',
  investor: 'border-green-400/50 bg-green-400/10 text-green-400',
  partner:  'border-amber-400/50 bg-amber-400/10 text-amber-400',
}

function joined(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AdminUsersPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      const supabase = createClient()
      const [{ data: usersRaw }, { data: rolesRaw }] = await Promise.all([
        supabase
          .from('users')
          .select('id, username, display_name, avatar_url, reputation, created_at')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('user_roles').select('user_id, role'),
      ])
      const roleMap = new Map<string, AppRole[]>()
      for (const r of (rolesRaw as { user_id: string; role: AppRole }[] | null) ?? []) {
        roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role])
      }
      const list = ((usersRaw as Omit<Row, 'roles'>[] | null) ?? []).map((u) => ({
        ...u,
        roles: roleMap.get(u.id) ?? [],
      }))
      if (!active) return
      setRows(list)
      setLoading(false)
    })()
    return () => { active = false }
  }, [])

  async function toggleRole(row: Row, role: AppRole) {
    const has = row.roles.includes(role)
    if (has && role === 'admin' && row.id === user?.id) {
      toast.error('Not allowed', 'You can’t revoke your own admin role.')
      return
    }
    setBusy(row.id + role)
    const supabase = createClient()
    const { error } = has
      ? await supabase.from('user_roles').delete().eq('user_id', row.id).eq('role', role)
      : await supabase.from('user_roles').insert({ user_id: row.id, role, granted_by: user?.id ?? null })
    setBusy(null)
    if (error) { toast.error('Could not update role', error.message); return }
    setRows((prev) => prev.map((r) =>
      r.id === row.id
        ? { ...r, roles: has ? r.roles.filter((x) => x !== role) : [...r.roles, role] }
        : r,
    ))
  }

  async function saveReputation(row: Row, raw: string) {
    const value = Number(raw)
    if (!Number.isFinite(value) || value === row.reputation) return
    setBusy(row.id + 'rep')
    const supabase = createClient()
    const { error } = await supabase.rpc('admin_set_reputation', { target: row.id, value: Math.max(0, Math.round(value)) })
    setBusy(null)
    if (error) { toast.error('Could not update reputation', error.message); return }
    const next = Math.max(0, Math.round(value))
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, reputation: next } : r)))
    toast.success('Reputation updated', `@${row.username} → ${next}`)
  }

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase()
    return !q || r.username.toLowerCase().includes(q) || (r.display_name?.toLowerCase().includes(q) ?? false)
  })

  return (
    <div>
      {/* Search */}
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username or name…"
          className="w-full border-2 border-border bg-card py-3 pl-11 pr-4 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 animate-pulse border-2 border-border bg-card" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="border-2 border-dashed border-border p-12 text-center font-mono text-sm text-muted-foreground">
          No users found.
        </p>
      ) : (
        <>
          <p className="mb-4 font-mono text-xs text-muted-foreground">
            {filtered.length} user{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-col gap-3">
            {filtered.map((row) => (
              <div key={row.id} className="border-2 border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Identity */}
                  <Link href={`/u/${row.username}`} className="group flex min-w-0 items-center gap-3">
                    <PixelAvatar
                      username={row.username}
                      avatarColor={colorFromId(row.id)}
                      size={36}
                      imageUrl={row.avatar_url ?? undefined}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm text-foreground group-hover:text-primary">
                        {row.display_name ?? row.username}
                        {row.id === user?.id && <span className="ml-2 font-mono text-[10px] text-muted-foreground">(you)</span>}
                      </p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        @{row.username} · joined {joined(row.created_at)}
                      </p>
                    </div>
                  </Link>

                  {/* Reputation */}
                  <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    rep
                    <input
                      type="number"
                      defaultValue={row.reputation}
                      onBlur={(e) => saveReputation(row, e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                      disabled={busy === row.id + 'rep'}
                      className="w-20 border-2 border-input bg-background px-2 py-1.5 font-mono text-xs text-foreground outline-none transition-colors focus:border-primary disabled:opacity-60"
                    />
                  </label>
                </div>

                {/* Roles */}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">roles</span>
                  {ALL_ROLES.map((role) => {
                    const active = row.roles.includes(role)
                    const isBusy = busy === row.id + role
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(row, role)}
                        disabled={isBusy}
                        className={
                          'inline-flex items-center gap-1.5 border-2 px-2.5 py-1 font-pixel text-[9px] uppercase tracking-wider transition-all duration-100 disabled:opacity-50 ' +
                          (active ? ROLE_STYLE[role] : 'border-border bg-background text-muted-foreground hover:border-primary hover:text-primary')
                        }
                      >
                        {active && <Check className="h-3 w-3" />}
                        {role}
                      </button>
                    )
                  })}
                  {row.roles.length === 0 && (
                    <span className="font-mono text-[10px] text-muted-foreground/60">reader</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
