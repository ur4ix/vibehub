'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { PixelButton } from './pixel-button'
import { PixelAvatar } from './pixel-avatar'
import { useAuth } from './auth-provider'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'

type Repository = Tables<'repositories'>

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="border-2 border-border bg-background px-4 py-3 text-center">
      <div className="font-pixel text-sm text-primary">{value}</div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  )
}

export function ProfileView() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [repos, setRepos] = useState<Repository[]>([])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ username: '', displayName: '', bio: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from('repositories')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRepos(data ?? []))
  }, [user])

  function startEdit() {
    if (!user) return
    setDraft({ username: user.username, displayName: user.displayName ?? '', bio: '' })
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
      })
      .eq('id', user.id)
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setEditing(false)
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

                  <Field
                    label="Username"
                    value={draft.username}
                    onChange={(v) => setDraft((d) => ({ ...d, username: v }))}
                    placeholder="vibecoder"
                  />
                  <Field
                    label="Display name"
                    value={draft.displayName}
                    onChange={(v) => setDraft((d) => ({ ...d, displayName: v }))}
                    placeholder="Vibe Coder"
                  />
                  <div className="flex flex-col gap-2">
                    <label htmlFor="bio" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      rows={3}
                      value={draft.bio}
                      onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                      placeholder="What do you build?"
                      className="resize-none border-2 border-input bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
                    />
                  </div>

                  {saveError && (
                    <p className="font-mono text-xs text-destructive">{saveError}</p>
                  )}

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
                      {user.displayName ?? user.username}
                    </h1>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">@{user.username}</p>
                    <p className="mt-2 font-mono text-xs text-muted-foreground">{user.email}</p>
                  </div>

                  <div className="mt-5 flex items-center justify-center gap-2 border-2 border-border bg-secondary px-4 py-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      reputation
                    </span>
                    <span className="font-pixel text-xs text-primary">{user.reputation}</span>
                  </div>

                  <PixelButton variant="outline" className="mt-6 w-full" onClick={startEdit}>
                    Edit profile
                  </PixelButton>
                  <PixelButton
                    className="mt-3 w-full"
                    onClick={() => router.push('/upload')}
                  >
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
                        <span
                          key={t}
                          className="border border-border bg-secondary px-2 py-1 font-mono text-[10px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                      <span className={
                        'ml-auto font-mono text-[10px] ' +
                        (r.is_published ? 'text-primary' : 'text-muted-foreground')
                      }>
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

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="font-mono text-xs uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-2 border-input bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
      />
    </div>
  )
}
