'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelButton } from '@/components/pixel-button'
import { Markdown } from '@/components/markdown'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/components/pixel-toast'
import { createClient } from '@/lib/supabase/client'
import { containsBanned, BANNED_MESSAGE } from '@/lib/banned-words'
import type { Post } from '@/types/database'

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
}

interface PostEditorProps {
  /** When set, the editor loads and updates an existing post. */
  slug?: string
}

type Phase = 'checking' | 'forbidden' | 'loading' | 'notfound' | 'ready'

export function PostEditor({ slug }: PostEditorProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const toast = useToast()

  const [phase, setPhase] = useState<Phase>('checking')
  const [postId, setPostId] = useState<string | null>(null)

  // form
  const [title, setTitle] = useState('')
  const [slugValue, setSlugValue] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [category, setCategory] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [body, setBody] = useState('')
  const [preview, setPreview] = useState(false)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auth + role gate, plus load when editing.
  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/auth'); return }

    const supabase = createClient()
    let active = true

    ;(async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      if (!active) return
      if (!roles?.length) { setPhase('forbidden'); return }

      if (!slug) { setPhase('ready'); return }

      setPhase('loading')
      const { data } = await supabase.from('posts').select('*').eq('slug', slug).maybeSingle()
      if (!active) return
      const post = data as Post | null
      if (!post) { setPhase('notfound'); return }

      setPostId(post.id)
      setTitle(post.title)
      setSlugValue(post.slug)
      setSlugTouched(true)
      setCategory(post.category ?? '')
      setExcerpt(post.excerpt ?? '')
      setCoverUrl(post.cover_url ?? '')
      setBody(post.body)
      setPhase('ready')
    })()

    return () => { active = false }
  }, [authLoading, user, slug, router])

  function validate(): string | null {
    if (!title.trim()) return 'Title is required'
    if (!/^[a-z0-9-]{1,120}$/.test(slugValue)) return 'Slug: lowercase letters, digits and hyphens'
    if (!body.trim()) return 'Body cannot be empty'
    if (containsBanned(title, slugValue, excerpt, body)) return BANNED_MESSAGE
    return null
  }

  async function save(status: 'draft' | 'published') {
    if (!user) return
    const v = validate()
    if (v) { setError(v); return }
    setError(null)
    setSaving(true)

    const supabase = createClient()
    const payload = {
      slug: slugValue,
      title: title.trim(),
      excerpt: excerpt.trim() || null,
      cover_url: coverUrl.trim() || null,
      category: category.trim() || null,
      body,
      status,
    }

    let errMsg: string | null = null
    if (postId) {
      const { error: e } = await supabase.from('posts').update(payload).eq('id', postId)
      errMsg = e?.message ?? null
    } else {
      const { error: e } = await supabase.from('posts').insert({ ...payload, author_id: user.id })
      errMsg = e?.code === '23505' ? 'A post with this slug already exists' : e?.message ?? null
    }

    setSaving(false)
    if (errMsg) { setError(errMsg); return }

    toast.success(status === 'published' ? 'Post published!' : 'Draft saved')
    router.push(status === 'published' ? `/blog/${slugValue}` : '/blog')
    router.refresh()
  }

  async function remove() {
    if (!postId || deleting) return
    if (!window.confirm('Delete this post permanently? This cannot be undone.')) return
    setDeleting(true)
    const supabase = createClient()
    const { error: e } = await supabase.from('posts').delete().eq('id', postId)
    setDeleting(false)
    if (e) { setError(e.message); return }
    toast.success('Post deleted')
    router.push('/blog')
    router.refresh()
  }

  // ── states ────────────────────────────────────────────────────────────────

  if (phase === 'checking' || phase === 'loading' || authLoading) {
    return (
      <Shell>
        <p className="font-mono text-sm text-muted-foreground">Loading<span className="blink">_</span></p>
      </Shell>
    )
  }

  if (phase === 'forbidden') {
    return (
      <Shell>
        <div className="text-center">
          <p className="font-pixel text-xs text-muted-foreground">You don&apos;t have permission to write posts.</p>
          <p className="mt-3 font-mono text-xs text-muted-foreground">Blog authoring is limited to the Vydex team.</p>
          <Link href="/blog" className="mt-5 inline-block font-mono text-sm text-primary hover:underline">← Back to blog</Link>
        </div>
      </Shell>
    )
  }

  if (phase === 'notfound') {
    return (
      <Shell>
        <div className="text-center">
          <p className="font-pixel text-xs text-muted-foreground">Post not found.</p>
          <Link href="/blog" className="mt-5 inline-block font-mono text-sm text-primary hover:underline">← Back to blog</Link>
        </div>
      </Shell>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <nav className="mb-8 font-mono text-xs text-muted-foreground">
          <Link href="/blog" className="hover:text-primary">blog</Link>
          {' / '}
          <span className="text-foreground">{postId ? 'edit' : 'new post'}</span>
        </nav>

        <h1 className="font-pixel text-lg leading-[1.5]">{postId ? 'Edit post' : 'New post'}</h1>

        <form className="mt-8 flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
          <FieldLabel label="Title">
            <input
              value={title}
              onChange={(e) => {
                const v = e.target.value
                setTitle(v)
                if (!slugTouched) setSlugValue(slugify(v))
              }}
              maxLength={160}
              placeholder="A great headline"
              className="border-2 border-input bg-background px-4 py-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
            />
          </FieldLabel>

          <FieldLabel label="Slug (URL)">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center font-mono text-xs text-muted-foreground">vydex.dev/blog/</span>
              <input
                value={slugValue}
                onChange={(e) => { setSlugTouched(true); setSlugValue(slugify(e.target.value)) }}
                className="w-full border-2 border-input bg-background py-3 pl-[8.5rem] pr-3 font-mono text-sm outline-none transition-colors focus:border-primary"
              />
            </div>
          </FieldLabel>

          <div className="grid gap-5 sm:grid-cols-2">
            <FieldLabel label="Category (optional)">
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                maxLength={40}
                placeholder="Guide, Product, Tutorial…"
                className="border-2 border-input bg-background px-4 py-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
              />
            </FieldLabel>
            <FieldLabel label="Cover image URL (optional)">
              <input
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://…"
                className="border-2 border-input bg-background px-4 py-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
              />
            </FieldLabel>
          </div>

          <FieldLabel label="Excerpt (optional)">
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="One or two sentences shown in listings."
              className="resize-none border-2 border-input bg-background px-4 py-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
            />
          </FieldLabel>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Body (markdown)</span>
              <button
                type="button"
                onClick={() => setPreview((p) => !p)}
                className="border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {preview ? 'Write' : 'Preview'}
              </button>
            </div>
            {preview ? (
              <div className="min-h-64 border-2 border-border bg-card p-4">
                {body.trim() ? <Markdown>{body}</Markdown> : <p className="font-mono text-xs text-muted-foreground">Nothing to preview.</p>}
              </div>
            ) : (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={18}
                placeholder={'# Heading\n\nWrite your post in **markdown**…'}
                className="resize-y border-2 border-input bg-background px-4 py-3 font-mono text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
              />
            )}
          </div>

          {error && <p role="alert" className="font-mono text-xs text-destructive">{error}</p>}

          <div className="flex flex-wrap gap-3 pt-2">
            <PixelButton type="button" disabled={saving} onClick={() => save('published')}>
              {saving ? 'Saving…' : 'Publish'}
            </PixelButton>
            <PixelButton type="button" variant="outline" disabled={saving} onClick={() => save('draft')}>
              Save draft
            </PixelButton>
            {postId && (
              <button
                type="button"
                onClick={remove}
                disabled={deleting || saving}
                className="inline-flex items-center gap-1.5 border-2 border-destructive bg-destructive/5 px-4 py-2.5 font-pixel text-[10px] uppercase leading-none tracking-wider text-destructive transition-all duration-100 [box-shadow:3px_3px_0_0_var(--destructive)] hover:bg-destructive hover:text-white active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
            <Link
              href="/blog"
              className="ml-auto inline-flex items-center font-mono text-sm text-muted-foreground hover:text-primary"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="grid flex-1 place-items-center px-4">{children}</main>
      <SiteFooter />
    </div>
  )
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
