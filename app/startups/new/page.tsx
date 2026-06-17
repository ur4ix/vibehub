'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelButton } from '@/components/pixel-button'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/components/pixel-toast'
import { createClient } from '@/lib/supabase/client'
import { containsBanned, BANNED_MESSAGE } from '@/lib/banned-words'

type Stage = 'idea' | 'mvp' | 'launched' | 'revenue' | 'scaling'
type Funding = 'bootstrapped' | 'raising' | 'funded'

const STAGES: { value: Stage; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'mvp', label: 'MVP' },
  { value: 'launched', label: 'Launched' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'scaling', label: 'Scaling' },
]
const FUNDING: { value: Funding; label: string; desc: string }[] = [
  { value: 'bootstrapped', label: 'Bootstrapped', desc: 'Self-funded, not raising' },
  { value: 'raising',      label: 'Raising',      desc: 'Open to investment' },
  { value: 'funded',       label: 'Funded',       desc: 'Already backed' },
]

export default function NewStartupPage() {
  const router = useRouter()
  const { user } = useAuth()
  const toast = useToast()

  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [industry, setIndustry] = useState('')
  const [stage, setStage] = useState<Stage>('idea')
  const [funding, setFunding] = useState<Funding>('bootstrapped')
  const [raising, setRaising] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  function addTag(raw: string) {
    const tag = raw.trim().replace(/[^a-zA-Z0-9._\-+#]/g, '')
    if (tag && !tags.includes(tag) && tags.length < 8) setTags((t) => [...t, tag])
    setTagInput('')
  }
  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
    if (e.key === 'Backspace' && !tagInput) setTags((t) => t.slice(0, -1))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { router.push('/auth'); return }
    if (containsBanned(name, tagline, description, website, tags)) {
      toast.error('Not allowed', BANNED_MESSAGE)
      return
    }
    setSubmitting(true)

    const supabase = createClient()
    const { error } = await supabase.from('startups').insert({
      owner_id: user.id,
      name: name.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      website: website.trim() || null,
      industry: industry.trim() || null,
      stage,
      funding_status: funding,
      raising_amount: funding === 'raising' && raising ? Number(raising) : null,
      tags,
    })

    setSubmitting(false)
    if (error) { toast.error('Failed to list startup', error.message); return }
    toast.success('Startup listed!', 'Investors can now discover it.')
    router.push('/startups')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <nav className="mb-8 font-mono text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">~</Link>
          {' / '}
          <Link href="/startups" className="hover:text-primary">startups</Link>
          {' / '}
          <span className="text-foreground">new</span>
        </nav>

        <h1 className="mb-8 font-pixel text-sm leading-relaxed">List your startup</h1>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <Field label="Startup name" required>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vydex" maxLength={80}
              className="w-full border-2 border-input bg-background px-4 py-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary" />
          </Field>

          <Field label="Tagline" required hint="One line that sells it">
            <input type="text" required value={tagline} onChange={(e) => setTagline(e.target.value)}
              placeholder="The marketplace for vibe coders" maxLength={120}
              className="w-full border-2 border-input bg-background px-4 py-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary" />
          </Field>

          <Field label="Description" required hint="What you're building, traction, the team">
            <textarea required rows={6} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the product, the problem, traction and what you're looking for…"
              className="w-full resize-none border-2 border-input bg-background px-4 py-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary" />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Website">
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://…"
                className="w-full border-2 border-input bg-background px-4 py-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary" />
            </Field>
            <Field label="Industry">
              <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
                placeholder="AI, Fintech, DevTools…" maxLength={40}
                className="w-full border-2 border-input bg-background px-4 py-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary" />
            </Field>
          </div>

          <Field label="Stage" required>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <button key={s.value} type="button" onClick={() => setStage(s.value)}
                  className={
                    'font-pixel border-2 px-3 py-2 text-[9px] uppercase tracking-wider transition-colors ' +
                    (stage === s.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary hover:text-primary')
                  }>
                  {s.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Funding" required>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {FUNDING.map((f) => (
                <button key={f.value} type="button" onClick={() => setFunding(f.value)}
                  className={
                    'flex flex-col items-start border-2 p-3 text-left transition-colors ' +
                    (funding === f.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60')
                  }>
                  <span className="font-pixel text-[10px] uppercase tracking-wider text-foreground">{f.label}</span>
                  <span className="mt-1 font-mono text-[10px] text-muted-foreground">{f.desc}</span>
                </button>
              ))}
            </div>
          </Field>

          {funding === 'raising' && (
            <Field label="Raising (USD)" hint="Optional — your target round">
              <div className="flex border-2 border-input bg-background focus-within:border-primary transition-colors">
                <span className="flex items-center border-r border-border bg-secondary px-3 font-mono text-[11px] text-muted-foreground">$</span>
                <input type="number" min={0} value={raising} onChange={(e) => setRaising(e.target.value)}
                  placeholder="100000"
                  className="flex-1 bg-transparent px-3 py-3 font-mono text-sm outline-none placeholder:text-muted-foreground/60" />
              </div>
            </Field>
          )}

          <Field label="Tags" hint="Press Enter or comma to add · max 8">
            <div className="flex flex-wrap gap-2 border-2 border-input bg-background p-2 focus-within:border-primary transition-colors">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 border border-border bg-secondary px-2 py-1 font-mono text-[10px]">
                  {t}
                  <button type="button" onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                    className="ml-1 text-muted-foreground hover:text-destructive" aria-label={`Remove ${t}`}>×</button>
                </span>
              ))}
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown} onBlur={() => addTag(tagInput)}
                placeholder={tags.length === 0 ? 'AI, B2B, SaaS…' : ''}
                className="min-w-[120px] flex-1 bg-transparent px-1 py-1 font-mono text-sm outline-none placeholder:text-muted-foreground/60" />
            </div>
          </Field>

          <div className="flex gap-3 pt-2">
            <PixelButton type="submit" disabled={submitting} className="flex-1 py-3">
              {submitting ? 'Listing…' : 'List startup'}
            </PixelButton>
            <PixelButton type="button" variant="outline" className="flex-1 py-3" onClick={() => router.push('/startups')}>
              Cancel
            </PixelButton>
          </div>
        </form>
      </main>

      <SiteFooter />
    </div>
  )
}

function Field({ label, children, required, hint }: {
  label: string; children: React.ReactNode; required?: boolean; hint?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="ml-1 text-primary">*</span>}
      </label>
      {hint && <p className="font-mono text-[10px] text-muted-foreground/70">{hint}</p>}
      {children}
    </div>
  )
}
