'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Camera, Check, Plus, MessageSquare } from 'lucide-react'
import type { UserIdentity, Provider } from '@supabase/supabase-js'
import { PixelButton } from './pixel-button'
import { PixelAvatar, colorFromId } from './pixel-avatar'
import { FollowButton } from './follow-button'
import { containsBanned, BANNED_MESSAGE } from '@/lib/banned-words'
import type { BadgeDef } from '@/lib/badges'
import { createClient } from '@/lib/supabase/client'

type ProviderKey = 'github' | 'x'
const SOCIAL_PROVIDERS: { key: ProviderKey; title: string }[] = [
  { key: 'github', title: 'GitHub' },
  { key: 'x', title: 'X' },
]

function formatJoined(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

// Roles worth showing as a badge, in display priority. 'author' is internal.
// 'admin' is only visible to the user themselves / other admins (not public).
const ROLE_BADGES: { role: string; label: string; className: string }[] = [
  { role: 'admin',     label: 'Admin',     className: 'border-primary bg-primary/10 text-primary' },
  { role: 'team',      label: 'Team',      className: 'border-primary bg-primary/10 text-primary' },
  { role: 'moderator', label: 'Mod',       className: 'border-red-400/50 bg-red-400/10 text-red-400' },
  { role: 'partner',   label: 'Partner',   className: 'border-amber-400/50 bg-amber-400/10 text-amber-400' },
  { role: 'investor',  label: 'Investor',  className: 'border-green-400/50 bg-green-400/10 text-green-400' },
]

function handleOf(identity: UserIdentity): string | null {
  const d = (identity.identity_data ?? {}) as Record<string, string | undefined>
  return d.user_name ?? d.preferred_username ?? d.screen_name ?? d.nickname ?? null
}

export interface ProfileCardProps {
  userId: string
  initialUsername: string
  initialDisplayName: string | null
  initialAvatarUrl: string | null
  initialBio: string | null
  reputation: number
  createdAt: string
  githubUsername: string | null
  xUsername: string | null
  roles: string[]
  badges: BadgeDef[]
  isOwner: boolean
  currentUserId: string | null
  isFollowing: boolean
}

export function ProfileCard(props: ProfileCardProps) {
  const router = useRouter()
  const username = props.initialUsername
  const [displayName, setDisplayName] = useState(props.initialDisplayName)
  const [bio, setBio] = useState(props.initialBio)
  const [avatarUrl, setAvatarUrl] = useState(props.initialAvatarUrl)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ username: '', displayName: '', bio: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [identities, setIdentities] = useState<UserIdentity[]>([])
  const [linking, setLinking] = useState<ProviderKey | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Owner-only: load linked OAuth identities for the verified-connect UI.
  useEffect(() => {
    if (!props.isOwner) return
    const supabase = createClient()
    let active = true
    ;(async () => {
      await supabase.rpc('sync_verified_socials')
      const { data } = await supabase.auth.getUserIdentities()
      if (active) setIdentities(data?.identities ?? [])
    })()
    return () => { active = false }
  }, [props.isOwner])

  function identityFor(provider: ProviderKey) {
    const keys = provider === 'x' ? ['x', 'twitter'] : [provider]
    return identities.find((i) => keys.includes(i.provider))
  }

  function startEdit() {
    setDraft({ username, displayName: displayName ?? '', bio: bio ?? '' })
    setSaveError(null)
    setEditing(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (containsBanned(draft.username, draft.displayName, draft.bio)) {
      setSaveError(BANNED_MESSAGE)
      return
    }
    setSaving(true)
    setSaveError(null)
    const supabase = createClient()
    const nextUsername = draft.username.trim() || username
    const { error } = await supabase.rpc('save_profile', {
      p_username: nextUsername,
      p_display_name: draft.displayName.trim() || null,
      p_bio: draft.bio.trim() || null,
    })
    setSaving(false)
    if (error) { setSaveError(error.message); return }

    setDisplayName(draft.displayName.trim() || null)
    setBio(draft.bio.trim() || null)
    setEditing(false)
    if (nextUsername !== username) {
      // The URL carries the old username — move to the new one.
      router.push(`/u/${nextUsername}`)
    } else {
      router.refresh()
    }
  }

  async function connectSocial(provider: ProviderKey) {
    setSaveError(null)
    setLinking(provider)
    const supabase = createClient()
    const { error } = await supabase.auth.linkIdentity({
      provider: provider as Provider,
      options: { redirectTo: `${location.origin}/auth/callback?next=/u/${username}` },
    })
    if (error) { setSaveError(error.message); setLinking(null) }
  }

  async function disconnectSocial(provider: ProviderKey) {
    const identity = identityFor(provider)
    if (!identity) return
    setSaveError(null)
    setLinking(provider)
    const supabase = createClient()
    const { error } = await supabase.auth.unlinkIdentity(identity)
    if (error) { setSaveError(error.message); setLinking(null); return }
    await supabase.rpc('sync_verified_socials')
    const { data } = await supabase.auth.getUserIdentities()
    setIdentities(data?.identities ?? [])
    setLinking(null)
    router.refresh()
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !props.currentUserId) return
    const objectUrl = URL.createObjectURL(file)
    setAvatarPreview(objectUrl)
    setAvatarUploading(true)

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${props.currentUserId}/avatar.${ext}`
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
    await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', props.currentUserId)
    setAvatarUrl(publicUrl)
    setAvatarUploading(false)
    router.refresh()
  }

  // ── Edit form ──────────────────────────────────────────────────────────────
  if (props.isOwner && editing) {
    return (
      <div className="border-2 border-border bg-card p-6 pixel-shadow-border">
        <form className="flex flex-col gap-4" onSubmit={save}>
          <h2 className="font-pixel text-[11px] uppercase tracking-wider">Edit profile</h2>

          <div className="flex flex-col items-center gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading} className="group relative" aria-label="Upload avatar">
              <PixelAvatar username={username} avatarColor={colorFromId(props.userId)} size={80} imageUrl={avatarPreview ?? avatarUrl} className="!border-4" />
              <span className="absolute inset-0 grid place-items-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 group-disabled:opacity-0">
                <Camera className="h-6 w-6 text-white" />
              </span>
            </button>
            <span className="font-mono text-[10px] text-muted-foreground">
              {avatarUploading ? 'Uploading…' : 'Click to change avatar'}
            </span>
          </div>

          <Field label="Username" value={draft.username} onChange={(v) => setDraft((d) => ({ ...d, username: v }))} placeholder="username" />
          <Field label="Display name" value={draft.displayName} onChange={(v) => setDraft((d) => ({ ...d, displayName: v }))} placeholder="Your Name" />

          <div className="flex flex-col gap-2">
            <label htmlFor="bio" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Bio</label>
            <textarea id="bio" rows={3} value={draft.bio} onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))} placeholder="What do you build?"
              className="resize-none border-2 border-input bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary" />
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-1 font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">Connected accounts</p>
            <p className="mb-3 font-mono text-[10px] leading-relaxed text-muted-foreground/70">
              Verified by signing in — no one can claim a handle they don&apos;t own.
            </p>
            <div className="flex flex-col gap-2">
              {SOCIAL_PROVIDERS.map((p) => {
                const identity = identityFor(p.key)
                return (
                  <SocialConnectRow
                    key={p.key}
                    title={p.title}
                    handle={identity ? handleOf(identity) : null}
                    connected={Boolean(identity)}
                    busy={linking === p.key}
                    onConnect={() => connectSocial(p.key)}
                    onDisconnect={() => disconnectSocial(p.key)}
                  />
                )
              })}
            </div>
          </div>

          {saveError && <p className="font-mono text-xs text-destructive">{saveError}</p>}

          <div className="mt-2 flex gap-3">
            <PixelButton type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save'}</PixelButton>
            <PixelButton type="button" variant="outline" className="flex-1" onClick={() => setEditing(false)}>Cancel</PixelButton>
          </div>
        </form>
      </div>
    )
  }

  // ── Read-only card (owner or visitor) ────────────────────────────────────────
  // Verified handles come from the public profiles view, so visitors see them too.
  const socialLinks = [
    props.githubUsername
      ? { title: 'GitHub', href: `https://github.com/${props.githubUsername}`, label: props.githubUsername, icon: <GithubIcon className="h-4 w-4" /> }
      : null,
    props.xUsername
      ? { title: 'X', href: `https://x.com/${props.xUsername}`, label: props.xUsername, icon: <XIcon className="h-4 w-4" /> }
      : null,
  ].filter(Boolean) as { title: string; href: string; label: string; icon: React.ReactNode }[]

  return (
    <div className="border-2 border-border bg-card p-6 pixel-shadow-border">
      <div className="flex flex-col items-center text-center">
        <PixelAvatar username={username} avatarColor={colorFromId(props.userId)} size={88} className="!border-4" imageUrl={avatarUrl} />
        <h1 className="mt-5 font-pixel text-sm leading-[1.5]">{displayName ?? username}</h1>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">@{username}</p>

        {ROLE_BADGES.some((b) => props.roles.includes(b.role)) && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            {ROLE_BADGES.filter((b) => props.roles.includes(b.role)).map((b) => (
              <span key={b.role} className={`border px-2 py-0.5 font-pixel text-[8px] uppercase tracking-wider ${b.className}`}>
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {bio && <p className="mt-5 text-pretty text-sm leading-relaxed text-foreground">{bio}</p>}

      <div className="mt-5 flex items-center justify-center gap-2 border-2 border-border bg-secondary px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">reputation</span>
        <span className="font-pixel text-xs text-primary">{props.reputation}</span>
      </div>

      {props.badges.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 font-pixel text-[8px] uppercase tracking-wider text-muted-foreground">{'// badges'}</p>
          <div className="flex flex-wrap gap-1.5">
            {props.badges.map((b) => (
              <span
                key={b.key}
                title={b.description}
                className={`cursor-help border px-2 py-0.5 font-pixel text-[8px] uppercase tracking-wider ${b.className}`}
              >
                {b.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {socialLinks.length > 0 && (
        <ul className="mt-5 flex flex-col gap-2">
          {socialLinks.map((s) => (
            <li key={s.href}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${s.title}: @${s.label}`}
                className="flex items-center gap-2 font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                <span className="shrink-0 text-primary">{s.icon}</span>
                <span className="truncate">@{s.label}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {props.isOwner ? (
        <>
          <PixelButton variant="outline" className="mt-6 w-full" onClick={startEdit}>Edit profile</PixelButton>
          <Link href="/settings/security" className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-border bg-transparent px-5 py-3 font-pixel text-[10px] uppercase leading-none tracking-wider text-foreground pixel-shadow-border transition-all duration-100 hover:border-primary hover:text-primary active:translate-x-1 active:translate-y-1 active:shadow-none">
            <Shield className="h-3 w-3" />
            Security settings
          </Link>
          <PixelButton className="mt-3 w-full" onClick={() => router.push('/upload')}>+ New repository</PixelButton>
        </>
      ) : (
        <>
          <FollowButton targetUserId={props.userId} currentUserId={props.currentUserId} initialFollowing={props.isFollowing} />
          <Link
            href={`/messages/${username}`}
            className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-border bg-transparent px-5 py-3 font-pixel text-[10px] uppercase leading-none tracking-wider text-foreground pixel-shadow-border transition-all duration-100 hover:border-primary hover:text-primary active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <MessageSquare className="h-3 w-3" />
            Message
          </Link>
        </>
      )}

      <p className="mt-5 text-center font-mono text-[10px] text-muted-foreground">
        Joined {formatJoined(props.createdAt)}
      </p>
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

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="border-2 border-input bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary" />
    </div>
  )
}

function SocialConnectRow({ title, handle, connected, busy, onConnect, onDisconnect }: {
  title: string; handle: string | null; connected: boolean; busy: boolean; onConnect: () => void; onDisconnect: () => void
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
        <button type="button" onClick={onDisconnect} disabled={busy} className="shrink-0 border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50">
          {busy ? '…' : 'Disconnect'}
        </button>
      ) : (
        <button type="button" onClick={onConnect} disabled={busy} className="flex shrink-0 items-center gap-1 border border-primary bg-primary/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary transition-colors hover:bg-primary/20 disabled:opacity-50">
          {busy ? '…' : (<><Plus className="h-3 w-3" />Connect</>)}
        </button>
      )}
    </div>
  )
}
