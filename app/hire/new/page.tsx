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

const BUDGET_TYPES = [
  { value: 'fixed',  label: 'Fixed price',          description: 'Pay a set amount on completion' },
  { value: 'equity', label: 'Equity / Revenue share', description: 'Offer % of the project' },
  { value: 'hourly', label: 'Hourly rate',            description: 'Pay per hour of work' },
] as const

type BudgetType = 'fixed' | 'equity' | 'hourly'

export default function PostJobPage() {
  const router   = useRouter()
  const { user } = useAuth()
  const toast    = useToast()

  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [budgetType,  setBudgetType]  = useState<BudgetType>('fixed')
  const [budgetValue, setBudgetValue] = useState('')
  const [tagInput,    setTagInput]    = useState('')
  const [tags,        setTags]        = useState<string[]>([])
  const [submitting,  setSubmitting]  = useState(false)

  function addTag(raw: string) {
    const tag = raw.trim().replace(/[^a-zA-Z0-9._\-+#]/g, '')
    if (tag && !tags.includes(tag) && tags.length < 8) setTags((t) => [...t, tag])
    setTagInput('')
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
    if (e.key === 'Backspace' && !tagInput)  setTags((t) => t.slice(0, -1))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { router.push('/auth'); return }

    if (containsBanned(title, description, tags)) {
      toast.error('Not allowed', BANNED_MESSAGE)
      return
    }

    setSubmitting(true)

    const supabase = createClient()
    const { error } = await supabase.from('jobs').insert({
      owner_id:    user.id,
      title:       title.trim(),
      description: description.trim(),
      budget_type:  budgetType,
      budget_value: Number(budgetValue),
      tags,
    })

    setSubmitting(false)

    if (error) {
      toast.error('Failed to post job', error.message)
      return
    }

    toast.success('Job posted!', 'Vibe coders will start applying soon.')
    router.push('/hire')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <nav className="mb-8 font-mono text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">~</Link>
          {' / '}
          <Link href="/hire" className="hover:text-primary">hire</Link>
          {' / '}
          <span className="text-foreground">new</span>
        </nav>

        <h1 className="mb-8 font-pixel text-sm leading-relaxed">Post a Job</h1>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <Field label="Job title" required>
            <input
              type="text" required value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Full-stack developer for SaaS MVP"
              className="w-full border-2 border-input bg-background px-4 py-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
            />
          </Field>

          <Field label="Description" required hint="What needs to be built? What skills are required?">
            <textarea
              required rows={6} value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the project, deliverables, and any requirements…"
              className="w-full resize-none border-2 border-input bg-background px-4 py-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
            />
          </Field>

          <Field label="Compensation type" required>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {BUDGET_TYPES.map((b) => (
                <button
                  key={b.value} type="button" onClick={() => setBudgetType(b.value)}
                  className={
                    'flex flex-col items-start border-2 p-3 text-left transition-colors ' +
                    (budgetType === b.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60')
                  }
                >
                  <span className="font-pixel text-[10px] uppercase tracking-wider text-foreground">{b.label}</span>
                  <span className="mt-1 font-mono text-[10px] text-muted-foreground">{b.description}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label={budgetType === 'fixed' ? 'Budget (USD)' : budgetType === 'equity' ? 'Equity / share (%)' : 'Hourly rate (USD/h)'} required>
            <div className="flex border-2 border-input bg-background focus-within:border-primary transition-colors">
              <span className="flex items-center border-r border-border bg-secondary px-3 font-mono text-[11px] text-muted-foreground">
                {budgetType === 'equity' ? '%' : '$'}
              </span>
              <input
                type="number" required min={0} value={budgetValue}
                onChange={(e) => setBudgetValue(e.target.value)}
                placeholder={budgetType === 'equity' ? '10' : '500'}
                className="flex-1 bg-transparent px-3 py-3 font-mono text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </Field>

          <Field label="Required skills" hint="Press Enter or comma to add · max 8">
            <div className="flex flex-wrap gap-2 border-2 border-input bg-background p-2 focus-within:border-primary transition-colors">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 border border-border bg-secondary px-2 py-1 font-mono text-[10px]">
                  {t}
                  <button type="button" onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                    className="ml-1 text-muted-foreground hover:text-destructive" aria-label={`Remove ${t}`}>×</button>
                </span>
              ))}
              <input
                type="text" value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => addTag(tagInput)}
                placeholder={tags.length === 0 ? 'React, TypeScript, Python…' : ''}
                className="min-w-[120px] flex-1 bg-transparent px-1 py-1 font-mono text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </Field>

          <div className="flex gap-3 pt-2">
            <PixelButton type="submit" disabled={submitting} className="flex-1 py-3">
              {submitting ? 'Posting…' : 'Post job'}
            </PixelButton>
            <PixelButton type="button" variant="outline" className="flex-1 py-3" onClick={() => router.push('/hire')}>
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
