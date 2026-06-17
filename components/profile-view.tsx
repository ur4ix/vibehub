'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Camera, Check, Plus, Info } from 'lucide-react'
import type { UserIdentity, Provider } from '@supabase/supabase-js'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { PixelButton } from './pixel-button'
import { PixelAvatar } from './pixel-avatar'
import { useAuth } from './auth-provider'
import { createClient } from '@/lib/supabase/client'
import type { Profile, ProfileDraft, Repository, UserUpdate } from '@/types/database'

// Verified-connect providers. `key` is the Supabase provider id; X now uses 'x'
// (Supabase renamed the legacy 'twitter' provider).
type ProviderKey = 'github' | 'x'
const SOCIAL_PROVIDERS: {
  key: ProviderKey
  title: string
  baseUrl: string
  field: 'github_username' | 'x_username'
}[] = [
  { key: 'github', title: 'GitHub', baseUrl: 'https://github.com/', field: 'github_username' },
  { key: 'x',      title: 'X',      baseUrl: 'https://x.com/',      field: 'x_username' },
]

function Stat({ value, label, hint }: { value: string | number; label: string; hint?: string }) {
  return (
    <div className="relative border-2 border-border bg-background px-4 py-3 text-center">
      {hint && (
        <span className="group/info absolute right-1.5 top-1.5 cursor-help">
          <Info className="h-3 w-3 text-muted-foreground/40 transition-colors group-hover/info:text-primary" />
          <span
            role="tooltip"
            className="pointer-events-none absolute right-0 top-5 z-20 w-44 border-2 border-border bg-card px-2.5 py-2 text-left font-mono text-[10px] normal-case leading-relaxed tracking-normal text-muted-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover/info:opacity-100"
          >
            {hint}
          </span>
        </span>
      )}
      <div className="font-pixel text-sm text-primary">{value}</div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  )
}

function GithubIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

function XIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

interface ProfileJob {
  id: string
  title: string
  budget_type: 'fixed' | 'equity' | 'hourly'
  budget_value: number
  status: 'open' | 'closed'
}
interface ProfileOrder {
  id: string
  title: string
  budget: number
  status: string
}
function jobBudget(t: ProfileJob['budget_type'], v: number) {
  return t === 'fixed' ? `$${v}` : t === 'equity' ? `${v}%` : `$${v}/h`
}

// Shared status badge colours for jobs + orders (border + text, compact).
function statusBadge(status: string) {
  switch (status) {
    case 'open':        return 'border-primary text-primary'
    case 'in_progress': return 'border-blue-400/50 text-blue-400'
    case 'review':      return 'border-amber-400/50 text-amber-400'
    case 'completed':   return 'border-green-400/50 text-green-400'
    default:            return 'border-border text-muted-foreground' // closed / cancelled
  }
}

export function ProfileView() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [repos, setRepos] = useState<Repository[]>([])
  const [jobs, setJobs] = useState<ProfileJob[]>([])
  const [orders, setOrders] = useState<ProfileOrder[]>([])
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ProfileDraft>({
    username: '',
    displayName: '',
    bio: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  // Linked OAuth identities — drive the verified Connect state
  const [identities, setIdentities] = useState<UserIdentity[]>([])
  const [linking, setLinking] = useState<ProviderKey | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Authoritative auth gate: check the session directly (reads cookies) instead
  // of the AuthProvider's `user`, which is briefly null right after F5 and was
  // racing this redirect — bouncing an authenticated user /auth -> /dashboard.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/auth')
    })
  }, [router])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    let active = true

    ;(async () => {
      // Reconcile users.github_username / x_username with the currently linked
      // identities (covers the return-from-OAuth case and GitHub-login signups).
      // Ignored if the migration hasn't been applied yet.
      await supabase.rpc('sync_verified_socials')

      const [{ data: p }, { data: r }, { data: jb }, { data: od }, { count: flw }, { count: flg }, identRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('repositories').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
        supabase.from('jobs').select('id, title, budget_type, budget_value, status').eq('owner_id', user.id).order('created_at', { ascending: false }),
        supabase.from('orders').select('id, title, budget, status').eq('owner_id', user.id).order('created_at', { ascending: false }),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
        supabase.auth.getUserIdentities(),
      ])

      if (!active) return
      setProfile(p as Profile | null)
      setRepos((r as Repository[] | null) ?? [])
      setJobs((jb as ProfileJob[] | null) ?? [])
      setOrders((od as ProfileOrder[] | null) ?? [])
      setFollowers(flw ?? 0)
      setFollowing(flg ?? 0)
      setIdentities(identRes.data?.identities ?? [])
    })()

    return () => { active = false }
  }, [user])

  function startEdit() {
    setDraft({
      username: profile?.username ?? user?.username ?? '',
      displayName: profile?.display_name ?? user?.displayName ?? '',
      bio: profile?.bio ?? '',
    })
    setSaveError(null)
    setEditing(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setSaveError(null)
    const supabase = createClient()

    const { error: rpcError } = await supabase.rpc('save_profile', {
      p_username:     draft.username.trim() || user.username,
      p_display_name: draft.displayName.trim() || null,
      p_bio:          draft.bio.trim() || null,
    })

    setSaving(false)

    if (rpcError) {
      setSaveError(rpcError.message)
      return
    }

    // Re-fetch fresh profile row
    const { data: refreshedRaw } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    setProfile(refreshedRaw as Profile | null)
    setEditing(false)
    router.refresh()
  }

  // ── Verified social connect / disconnect ──────────────────────────────────

  function identityFor(provider: ProviderKey) {
    // Supabase may store the X identity under the new 'x' provider or the
    // legacy 'twitter' one — match either.
    const keys = provider === 'x' ? ['x', 'twitter'] : [provider]
    return identities.find((i) => keys.includes(i.provider))
  }

  async function connectSocial(provider: ProviderKey) {
    if (!user) return
    setSaveError(null)
    setLinking(provider)
    const supabase = createClient()
    // linkIdentity needs "Manual Linking" enabled in Supabase Auth settings.
    const { error } = await supabase.auth.linkIdentity({
      provider: provider as Provider,
      options: { redirectTo: `${location.origin}/auth/callback?next=/profile` },
    })
    if (error) {
      // Stay on the page and surface the error (e.g. manual linking disabled,
      // provider not configured). On success the browser redirects to the provider.
      setSaveError(error.message)
      setLinking(null)
    }
  }

  async function disconnectSocial(provider: ProviderKey) {
    if (!user) return
    const identity = identityFor(provider)
    if (!identity) return
    setSaveError(null)
    setLinking(provider)
    const supabase = createClient()

    const { error: unlinkError } = await supabase.auth.unlinkIdentity(identity)
    if (unlinkError) {
      // Supabase refuses to unlink your only identity (would orphan the account).
      setSaveError(unlinkError.message)
      setLinking(null)
      return
    }

    await supabase.rpc('sync_verified_socials')
    const [{ data: refreshed }, identRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).maybeSingle(),
      supabase.auth.getUserIdentities(),
    ])
    setProfile(refreshed as Profile | null)
    setIdentities(identRes.data?.identities ?? [])
    setLinking(null)
    router.refresh()
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Instant preview
    const objectUrl = URL.createObjectURL(file)
    setAvatarPreview(objectUrl)
    setAvatarUploading(true)

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}/avatar.${ext}`   // bucket = 'avatars', no prefix needed
    const supabase = createClient()

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setSaveError(`Avatar upload failed: ${uploadError.message}`)
      setAvatarPreview(null)
      setAvatarUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

    const avatarPatch: UserUpdate = { avatar_url: publicUrl }
    await supabase
      .from('users')
      .update(avatarPatch)
      .eq('id', user.id)

    setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : null)
    setAvatarUploading(false)
    router.refresh()
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="grid flex-1 place-items-center px-4">
          <p className="font-mono text-sm text-muted-foreground">
            Loading<span className="blink">_</span>
          </p>
        </main>
        <SiteFooter />
      </div>
    )
  }

  const socialLinks = [
    profile?.github_username
      ? { href: `https://github.com/${profile.github_username}`, label: profile.github_username, icon: <GithubIcon className="h-4 w-4" />, title: 'GitHub' }
      : null,
    profile?.x_username
      ? { href: `https://x.com/${profile.x_username}`, label: profile.x_username, icon: <XIcon className="h-4 w-4" />, title: 'X' }
      : null,
  ].filter(Boolean) as NonNullable<{ href: string; label: string; icon: React.ReactNode; title: string }>[]

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 font-mono text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary">~</Link>
          {' / '}
          <span className="text-foreground">{user.username}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* Profile card */}
          <aside>
            <div className="border-2 border-border bg-card p-6 pixel-shadow-border">
              {editing ? (
                <form className="flex flex-col gap-4" onSubmit={save}>
                  <h2 className="font-pixel text-[11px] uppercase tracking-wider">Edit profile</h2>

                  {/* Avatar upload */}
                  <div className="flex flex-col items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="group relative"
                      aria-label="Upload avatar"
                    >
                      <PixelAvatar
                        username={user.username}
                        avatarColor={user.avatarColor}
                        size={80}
                        imageUrl={avatarPreview ?? profile?.avatar_url}
                        className="!border-4"
                      />
                      <span className="absolute inset-0 grid place-items-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 group-disabled:opacity-0">
                        <Camera className="h-6 w-6 text-white" />
                      </span>
                    </button>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {avatarUploading ? 'Uploading…' : 'Click to change avatar'}
                    </span>
                  </div>

                  <Field label="Username" value={draft.username}
                    onChange={(v) => setDraft((d) => ({ ...d, username: v }))} placeholder="username" />
                  <Field label="Display name" value={draft.displayName}
                    onChange={(v) => setDraft((d) => ({ ...d, displayName: v }))} placeholder="Your Name" />

                  <div className="flex flex-col gap-2">
                    <label htmlFor="bio" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Bio</label>
                    <textarea
                      id="bio"
                      rows={3}
                      value={draft.bio}
                      onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                      placeholder="What do you build?"
                      className="resize-none border-2 border-input bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
                    />
                  </div>

                  <div className="border-t border-border pt-4">
                    <p className="mb-1 font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">Connected accounts</p>
                    <p className="mb-3 font-mono text-[10px] leading-relaxed text-muted-foreground/70">
                      Verified by signing in — no one can claim a handle they don&apos;t own.
                    </p>
                    <div className="flex flex-col gap-2">
                      {SOCIAL_PROVIDERS.map((p) => {
                        const handle = profile?.[p.field] ?? null
                        const connected = Boolean(identityFor(p.key)) || Boolean(handle)
                        const busy = linking === p.key
                        return (
                          <SocialConnectRow
                            key={p.key}
                            title={p.title}
                            handle={handle}
                            connected={connected}
                            busy={busy}
                            onConnect={() => connectSocial(p.key)}
                            onDisconnect={() => disconnectSocial(p.key)}
                          />
                        )
                      })}
                    </div>
                  </div>

                  {saveError && <p className="font-mono text-xs text-destructive">{saveError}</p>}

                  <div className="mt-2 flex gap-3">
                    <PixelButton type="submit" disabled={saving} className="flex-1">
                      {saving ? 'Saving…' : 'Save'}
                    </PixelButton>
                    <PixelButton type="button" variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                      Cancel
                    </PixelButton>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex flex-col items-center text-center">
                    <PixelAvatar username={user.username} avatarColor={user.avatarColor} size={88} className="!border-4" imageUrl={profile?.avatar_url} />
                    <h1 className="mt-5 font-pixel text-sm leading-[1.5]">
                      {profile?.display_name ?? user.username}
                    </h1>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">@{user.username}</p>
                    <p className="mt-2 font-mono text-xs text-muted-foreground">{user.email}</p>
                    <Link href={`/u/${user.username}`} className="mt-2 font-mono text-[10px] text-primary hover:underline">
                      View public profile →
                    </Link>
                  </div>

                  {profile?.bio && (
                    <p className="mt-5 text-pretty text-sm leading-relaxed text-foreground">
                      {profile.bio}
                    </p>
                  )}

                  <div className="mt-5 flex items-center justify-center gap-2 border-2 border-border bg-secondary px-4 py-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">reputation</span>
                    <span className="font-pixel text-xs text-primary">{user.reputation}</span>
                  </div>

                  {/* Social links */}
                  {socialLinks.length > 0 && (
                    <ul className="mt-5 flex flex-col gap-2">
                      {socialLinks.map((s) => (
                        <li key={s.href}>
                          <a
                            href={s.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
                            aria-label={`${s.title}: ${s.label}`}
                          >
                            <span className="shrink-0 text-primary">{s.icon}</span>
                            <span className="truncate">{s.label}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}

                  <PixelButton variant="outline" className="mt-6 w-full" onClick={startEdit}>
                    Edit profile
                  </PixelButton>
                  <Link
                    href="/settings/security"
                    className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-border bg-transparent px-5 py-3 font-pixel text-[10px] uppercase leading-none tracking-wider text-foreground pixel-shadow-border transition-all duration-100 hover:border-primary hover:text-primary active:translate-x-1 active:translate-y-1 active:shadow-none"
                  >
                    <Shield className="h-3 w-3" />
                    Security settings
                  </Link>
                  <PixelButton className="mt-3 w-full" onClick={() => router.push('/upload')}>
                    + New repository
                  </PixelButton>
                </>
              )}
            </div>
          </aside>

          {/* Right column */}
          <section>
            <div className="grid grid-cols-3 gap-3">
              <Stat value={repos.length} label="repos" hint="All repositories you own — published and unpublished drafts." />
              <Stat value={user.reputation} label="reputation" hint="Points earned from sales, reviews and platform activity." />
              <Stat value={repos.filter((r) => r.is_published).length} label="published" hint="Repositories that are live and visible to everyone in Explore." />
              <Stat value={followers} label="followers" hint="People subscribed to your new publications." />
              <Stat value={following} label="following" hint="People whose publications you follow." />
              <Stat value={jobs.length + orders.length} label="postings" hint="Jobs and orders you've posted on the Hire and Orders boards." />
            </div>

            <h2 className="mt-10 font-pixel text-xs uppercase tracking-wider">Repositories</h2>

            {repos.length === 0 ? (
              <div className="mt-5 border-2 border-border bg-card p-8 text-center">
                <p className="font-mono text-sm text-muted-foreground">
                  No repositories yet.{' '}
                  <Link href="/upload" className="text-primary hover:underline">
                    Publish your first project
                  </Link>
                </p>
              </div>
            ) : (
              <div className="mt-5 flex flex-col gap-4">
                {repos.map((r) => (
                  <Link
                    key={r.id}
                    href={`/${user.username}/${r.slug}`}
                    className="group block border-2 border-border bg-card p-5 transition-all duration-100 hover:border-primary hover:pixel-shadow-border"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-mono text-sm text-foreground group-hover:text-primary">
                          {user.username}/{r.slug}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {r.description ?? r.title}
                        </p>
                      </div>
                      <span className="shrink-0 border-2 border-green-400/50 bg-green-400/10 px-3 py-1 font-pixel text-[10px] text-green-400">
                        {r.type === 'free' ? 'Free' : r.price_cents ? `$${(r.price_cents / 100).toFixed(0)}` : 'Paid'}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {r.tags?.slice(0, 4).map((t) => (
                        <span key={t} className="border border-border bg-secondary px-2 py-1 font-mono text-[10px] text-muted-foreground">
                          {t}
                        </span>
                      ))}
                      <span className={'ml-auto font-mono text-[10px] ' + (r.is_published ? 'text-primary' : 'text-muted-foreground')}>
                        {r.is_published ? 'published' : 'draft'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {jobs.length > 0 && (
              <>
                <h2 className="mt-10 font-pixel text-xs uppercase tracking-wider">Jobs</h2>
                <div className="mt-5 flex flex-col gap-3">
                  {jobs.map((j) => (
                    <Link key={j.id} href={`/hire/${j.id}`} className="flex items-center justify-between gap-4 border-2 border-border bg-card px-5 py-4 transition-colors hover:border-primary">
                      <p className="min-w-0 truncate font-mono text-sm text-foreground">{j.title}</p>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-pixel text-[9px] text-green-400">{jobBudget(j.budget_type, j.budget_value)}</span>
                        <span className={'border-2 px-2 py-1 font-pixel text-[8px] uppercase ' + statusBadge(j.status)}>{j.status}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {orders.length > 0 && (
              <>
                <h2 className="mt-10 font-pixel text-xs uppercase tracking-wider">Orders</h2>
                <div className="mt-5 flex flex-col gap-3">
                  {orders.map((o) => (
                    <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between gap-4 border-2 border-border bg-card px-5 py-4 transition-colors hover:border-primary">
                      <p className="min-w-0 truncate font-mono text-sm text-foreground">{o.title}</p>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-pixel text-[9px] text-green-400">${o.budget}</span>
                        <span className={'border-2 px-2 py-1 font-pixel text-[8px] uppercase ' + statusBadge(o.status)}>{o.status.replace('_', ' ')}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        id={id} type="text" value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="border-2 border-input bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
      />
    </div>
  )
}

function SocialConnectRow({ title, handle, connected, busy, onConnect, onDisconnect }: {
  title: string
  handle: string | null
  connected: boolean
  busy: boolean
  onConnect: () => void
  onDisconnect: () => void
}) {
  return (
    <div className="flex items-center gap-2 border-2 border-input bg-background px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-mono text-xs text-foreground">{title}</span>
        {connected && handle ? (
          <span className="flex items-center gap-1 font-mono text-[10px] text-primary">
            <Check className="h-3 w-3 shrink-0" />
            <span className="truncate">@{handle}</span>
          </span>
        ) : (
          <span className="font-mono text-[10px] text-muted-foreground/70">Not connected</span>
        )}
      </div>
      {connected ? (
        <button
          type="button"
          onClick={onDisconnect}
          disabled={busy}
          className="shrink-0 border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50"
        >
          {busy ? '…' : 'Disconnect'}
        </button>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          disabled={busy}
          className="flex shrink-0 items-center gap-1 border border-primary bg-primary/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
        >
          {busy ? '…' : (<><Plus className="h-3 w-3" />Connect</>)}
        </button>
      )}
    </div>
  )
}
