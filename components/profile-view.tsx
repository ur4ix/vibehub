'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield } from 'lucide-react'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { PixelButton } from './pixel-button'
import { PixelAvatar } from './pixel-avatar'
import { useAuth } from './auth-provider'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'

type DbUser = Tables<'users'>
type Repository = Tables<'repositories'>

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="border-2 border-border bg-background px-4 py-3 text-center">
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

function HuggingFaceIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <text y="18" fontSize="18">🤗</text>
    </svg>
  )
}

export function ProfileView() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<DbUser | null>(null)
  const [repos, setRepos] = useState<Repository[]>([])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    username: '',
    displayName: '',
    bio: '',
    github_username: '',
    huggingface_username: '',
    x_username: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/auth')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    Promise.all([
      supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single(),
      supabase
        .from('repositories')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false }),
    ]).then(([{ data: p }, { data: r }]) => {
      setProfile(p)
      setRepos(r ?? [])
    })
  }, [user])

  function startEdit() {
    setDraft({
      username: profile?.username ?? user?.username ?? '',
      displayName: profile?.display_name ?? user?.displayName ?? '',
      bio: profile?.bio ?? '',
      github_username: profile?.github_username ?? '',
      huggingface_username: profile?.huggingface_username ?? '',
      x_username: profile?.x_username ?? '',
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
    const { error } = await supabase
      .from('users')
      .update({
        username: draft.username.trim() || user.username,
        display_name: draft.displayName.trim() || null,
        bio: draft.bio.trim() || null,
        github_username: draft.github_username.trim() || null,
        huggingface_username: draft.huggingface_username.trim() || null,
        x_username: draft.x_username.trim() || null,
      })
      .eq('id', user.id)
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    // Refresh profile
    const supabase2 = createClient()
    const { data } = await supabase2.from('users').select('*').eq('id', user.id).single()
    setProfile(data)
    setEditing(false)
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
      ? { href: `https://github.com/${profile.github_username}`, label: `@${profile.github_username}`, icon: <GithubIcon className="h-4 w-4" />, title: 'GitHub' }
      : null,
    profile?.huggingface_username
      ? { href: `https://huggingface.co/${profile.huggingface_username}`, label: profile.huggingface_username, icon: <span className="text-sm leading-none">🤗</span>, title: 'Hugging Face' }
      : null,
    profile?.x_username
      ? { href: `https://x.com/${profile.x_username}`, label: `@${profile.x_username}`, icon: <XIcon className="h-4 w-4" />, title: 'X' }
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

                  <Field label="Username" value={draft.username}
                    onChange={(v) => setDraft((d) => ({ ...d, username: v }))} placeholder="vibecoder" />
                  <Field label="Display name" value={draft.displayName}
                    onChange={(v) => setDraft((d) => ({ ...d, displayName: v }))} placeholder="Vibe Coder" />

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
                    <p className="mb-3 font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">Social links</p>
                    <div className="flex flex-col gap-3">
                      <SocialField
                        label="GitHub username"
                        prefix="github.com/"
                        value={draft.github_username}
                        onChange={(v) => setDraft((d) => ({ ...d, github_username: v }))}
                        placeholder="torvalds"
                      />
                      <SocialField
                        label="Hugging Face username"
                        prefix="huggingface.co/"
                        value={draft.huggingface_username}
                        onChange={(v) => setDraft((d) => ({ ...d, huggingface_username: v }))}
                        placeholder="your-hf-name"
                      />
                      <SocialField
                        label="X username"
                        prefix="x.com/"
                        value={draft.x_username}
                        onChange={(v) => setDraft((d) => ({ ...d, x_username: v }))}
                        placeholder="username"
                      />
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
                    <PixelAvatar username={user.username} avatarColor={user.avatarColor} size={88} className="!border-4" />
                    <h1 className="mt-5 font-pixel text-sm leading-[1.5]">
                      {profile?.display_name ?? user.username}
                    </h1>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">@{user.username}</p>
                    <p className="mt-2 font-mono text-xs text-muted-foreground">{user.email}</p>
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
              <Stat value={repos.length} label="repos" />
              <Stat value={user.reputation} label="reputation" />
              <Stat value={repos.filter((r) => r.is_published).length} label="published" />
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
                    href={`/listing?slug=${r.slug}`}
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
                      <span className="shrink-0 border-2 border-primary bg-primary/10 px-3 py-1 font-pixel text-[10px] text-primary">
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

function SocialField({ label, prefix, value, onChange, placeholder }: {
  label: string; prefix: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="flex border-2 border-input bg-background focus-within:border-primary transition-colors">
        <span className="flex items-center border-r border-border bg-secondary px-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
          {prefix}
        </span>
        <input
          id={id} type="text" value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))}
          placeholder={placeholder}
          className="flex-1 bg-transparent px-3 py-2.5 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
        />
      </div>
    </div>
  )
}
