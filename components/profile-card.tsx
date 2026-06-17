'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Camera, Check, Plus } from 'lucide-react'
import type { UserIdentity, Provider } from '@supabase/supabase-js'
import { PixelButton } from './pixel-button'
import { PixelAvatar, colorFromId } from './pixel-avatar'
import { FollowButton } from './follow-button'
import { containsBanned, BANNED_MESSAGE } from '@/lib/banned-words'
import { createClient } from '@/lib/supabase/client'

type ProviderKey = 'github' | 'x'
const SOCIAL_PROVIDERS: { key: ProviderKey; title: string }[] = [
  { key: 'github', title: 'GitHub' },
  { key: 'x', title: 'X' },
]

function formatJoined(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

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
  const socialLinks = props.isOwner
    ? SOCIAL_PROVIDERS.map((p) => {
        const identity = identityFor(p.key)
        const handle = identity ? handleOf(identity) : null
        if (!handle) return null
        const base = p.key === 'github' ? 'https://github.com/' : 'https://x.com/'
        return { title: p.title, href: base + handle, label: handle }
      }).filter(Boolean) as { title: string; href: string; label: string }[]
    : []

  return (
    <div className="border-2 border-border bg-card p-6 pixel-shadow-border">
      <div className="flex flex-col items-center text-center">
        <PixelAvatar username={username} avatarColor={colorFromId(props.userId)} size={88} className="!border-4" imageUrl={avatarUrl} />
        <h1 className="mt-5 font-pixel text-sm leading-[1.5]">{displayName ?? username}</h1>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">@{username}</p>
      </div>

      {bio && <p className="mt-5 text-pretty text-sm leading-relaxed text-foreground">{bio}</p>}

      <div className="mt-5 flex items-center justify-center gap-2 border-2 border-border bg-secondary px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">reputation</span>
        <span className="font-pixel text-xs text-primary">{props.reputation}</span>
      </div>

      {socialLinks.length > 0 && (
        <ul className="mt-5 flex flex-col gap-2">
          {socialLinks.map((s) => (
            <li key={s.href}>
              <a href={s.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-mono text-xs text-muted-foreground transition-colors hover:text-primary">
                <span className="truncate">{s.title}: {s.label}</span>
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
        <FollowButton targetUserId={props.userId} currentUserId={props.currentUserId} initialFollowing={props.isFollowing} />
      )}

      <p className="mt-5 text-center font-mono text-[10px] text-muted-foreground">
        Joined {formatJoined(props.createdAt)}
      </p>
    </div>
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
