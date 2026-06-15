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

const DELIVERY_OPTIONS = [
  { value: '3',        label: '3 days' },
  { value: '7',        label: '1 week' },
  { value: '14',       label: '2 weeks' },
  { value: '30',       label: '1 month' },
  { value: 'flexible', label: 'Flexible' },
]

export default function NewOrderPage() {
  const router   = useRouter()
  const { user } = useAuth()
  const toast    = useToast()

  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [budget,      setBudget]      = useState('')
  const [delivery,    setDelivery]    = useState('7')
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
    setSubmitting(true)

    const supabase   = createClient()
    const deliveryDays = delivery === 'flexible' ? null : Number(delivery)

    const { error } = await supabase.from('orders').insert({
      owner_id:     user.id,
      title:        title.trim(),
      description:  description.trim(),
      budget:       Number(budget),
      delivery_days: deliveryDays,
      tags,
    })

    setSubmitting(false)

    if (error) {
      toast.error('Failed to post order', error.message)
      return
    }

    toast.success('Order posted!', 'Vibe coders can now bid on your project.')
    router.push('/orders')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <nav className="mb-8 font-mono text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">~</Link>
          {' / '}
          <Link href="/orders" className="hover:text-primary">orders</Link>
          {' / '}
          <span className="text-foreground">new</span>
        </nav>

        <div className="mb-8">
          <h1 className="font-pixel text-sm leading-relaxed">Create Order</h1>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Describe what you need built. Vibe coders will bid on your order.
          </p>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <Field label="What do you need?" required>
            <input
              type="text" required value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Stripe checkout integration for my SaaS"
              className="w-full border-2 border-input bg-background px-4 py-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
            />
          </Field>

          <Field label="Detailed description" required hint="The more detail, the better bids you'll receive.">
            <textarea
              required rows={7} value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the feature, expected behavior, tech stack, and what 'done' looks like…"
              className="w-full resize-none border-2 border-input bg-background px-4 py-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
            />
          </Field>

          <Field label="Your budget (USD)" required>
            <div className="flex border-2 border-input bg-background focus-within:border-primary transition-colors">
              <span className="flex items-center border-r border-border bg-secondary px-3 font-mono text-[11px] text-muted-foreground">$</span>
              <input
                type="number" required min={10} value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="250"
                className="flex-1 bg-transparent px-3 py-3 font-mono text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </Field>

          <Field label="Expected delivery">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {DELIVERY_OPTIONS.map((d) => (
                <button key={d.value} type="button" onClick={() => setDelivery(d.value)}
                  className={
                    'border-2 py-2 font-pixel text-[10px] uppercase tracking-wider transition-colors ' +
                    (delivery === d.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:border-primary hover:text-primary')
                  }
                >
                  {d.label}
                </button>
              ))}
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
                placeholder={tags.length === 0 ? 'React, Python, TypeScript…' : ''}
                className="min-w-[120px] flex-1 bg-transparent px-1 py-1 font-mono text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </Field>

          <div className="border-2 border-border bg-secondary px-4 py-3">
            <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
              <span className="text-primary">✦</span>{' '}
              Payment is held in escrow and only released when you approve the delivery.
              You are not charged until you accept a bid.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <PixelButton type="submit" disabled={submitting} className="flex-1 py-3">
              {submitting ? 'Posting…' : 'Post order'}
            </PixelButton>
            <PixelButton type="button" variant="outline" className="flex-1 py-3" onClick={() => router.push('/orders')}>
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
