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
import { PROJECT_TYPES, BUDGET_RANGES, TIMELINES, SKILL_PRESETS } from '@/lib/orders'

const MAX_SKILLS = 8

export default function NewOrderPage() {
  const router = useRouter()
  const { user } = useAuth()
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [projectType, setProjectType] = useState<string>(PROJECT_TYPES[0])
  const [description, setDescription] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [budgetIdx, setBudgetIdx] = useState(1) // $200–500
  const [timelineIdx, setTimelineIdx] = useState(1) // up to a week
  const [refs, setRefs] = useState('')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : prev.length >= MAX_SKILLS
          ? prev
          : [...prev, skill],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { router.push('/auth'); return }
    if (!title.trim()) { toast.error('Add a project name'); return }
    if (!description.trim()) { toast.error('Add a description'); return }
    if (containsBanned(title, description, refs, contact, skills)) {
      toast.error('Not allowed', BANNED_MESSAGE)
      return
    }

    setSubmitting(true)
    const supabase = createClient()
    const range = BUDGET_RANGES[budgetIdx]
    const timeline = TIMELINES[timelineIdx]

    const { error } = await supabase.from('orders').insert({
      owner_id: user.id,
      title: title.trim(),
      description: description.trim(),
      project_type: projectType,
      budget: range.min,
      budget_range: range.label,
      delivery_days: timeline.days,
      tags: skills,
      reference_links: refs.trim() || null,
      contact: contact.trim() || null,
    })

    setSubmitting(false)
    if (error) {
      toast.error('Failed to publish order', error.message)
      return
    }
    toast.success('Order published!', 'Vibe coders can now respond to your order.')
    router.push('/orders')
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 font-mono text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">~</Link>
          {' / '}
          <Link href="/orders" className="hover:text-primary">orders</Link>
          {' / '}
          <span className="text-foreground">new</span>
        </nav>

        {/* Heading */}
        <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// development order'}</span>
        <h1 className="mt-3 font-pixel text-lg leading-relaxed">Describe what you need built</h1>
        <p className="mt-3 font-mono text-sm text-muted-foreground">
          The clearer the brief, the faster the right vibe coder responds.
        </p>

        <form className="mt-10 flex flex-col gap-10" onSubmit={handleSubmit}>
          {/* 01 — Project name */}
          <Section n="01" label="Project name">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Analytics dashboard for a SaaS"
              className="w-full border-2 border-input bg-background px-4 py-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary"
            />
          </Section>

          {/* 02 — Project type */}
          <Section n="02" label="Project type">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PROJECT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setProjectType(t)}
                  className={
                    'border-2 px-4 py-3 text-left font-mono text-sm transition-colors ' +
                    (projectType === t
                      ? 'border-primary text-foreground'
                      : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground')
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </Section>

          {/* 03 — Description */}
          <Section n="03" label="Description & requirements">
            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={4000}
              placeholder="What should it do, key screens, integrations, special requests…"
              className="w-full resize-none border-2 border-input bg-background px-4 py-3 font-mono text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary"
            />
          </Section>

          {/* 04 — Required skills */}
          <Section n="04" label="Required skills" hint={`Pick the skills this build needs · max ${MAX_SKILLS}`}>
            <div className="flex flex-wrap gap-2">
              {SKILL_PRESETS.map((s) => {
                const active = skills.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSkill(s)}
                    className={
                      'border-2 px-3 py-2 font-mono text-xs transition-colors ' +
                      (active
                        ? 'border-primary text-foreground'
                        : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground')
                    }
                  >
                    {active ? '✓ ' : '+ '}{s}
                  </button>
                )
              })}
            </div>
          </Section>

          {/* 05 + 06 — Budget & timeline */}
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
            <Section n="05" label="Budget">
              <div className="flex flex-col gap-2">
                {BUDGET_RANGES.map((b, i) => (
                  <OptionRow key={b.label} label={b.label} selected={budgetIdx === i} onClick={() => setBudgetIdx(i)} />
                ))}
              </div>
            </Section>

            <Section n="06" label="Timeline">
              <div className="flex flex-col gap-2">
                {TIMELINES.map((t, i) => (
                  <OptionRow key={t.label} label={t.label} selected={timelineIdx === i} onClick={() => setTimelineIdx(i)} />
                ))}
              </div>
            </Section>
          </div>

          {/* 07 — Reference links */}
          <Section n="07" label="Reference links" hint="Optional">
            <input
              type="text"
              value={refs}
              onChange={(e) => setRefs(e.target.value)}
              placeholder="github / figma / example site (comma-separated)"
              className="w-full border-2 border-input bg-background px-4 py-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary"
            />
          </Section>

          {/* 08 — Contact */}
          <Section n="08" label="Contact" hint="Optional">
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="@telegram or email"
              className="w-full border-2 border-input bg-background px-4 py-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary"
            />
          </Section>

          {/* Footer */}
          <div className="flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
            <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
              Publishing is free. You pay only when you pick a developer.
            </p>
            <PixelButton type="submit" disabled={submitting} className="shrink-0 px-6 py-3">
              {submitting ? 'Publishing…' : 'Publish order'}
            </PixelButton>
          </div>
        </form>
      </main>

      <SiteFooter />
    </div>
  )
}

function Section({ n, label, hint, children }: {
  n: string; label: string; hint?: string; children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <span className="font-pixel text-sm text-primary">{n}</span>
        <span className="font-mono text-xs uppercase tracking-wider text-foreground">{label}</span>
      </div>
      {hint && <p className="-mt-1 font-mono text-[10px] text-muted-foreground/70">{hint}</p>}
      {children}
    </section>
  )
}

function OptionRow({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex items-center gap-3 border-2 px-4 py-3 text-left font-mono text-sm transition-colors ' +
        (selected ? 'border-primary text-foreground' : 'border-border text-muted-foreground hover:border-primary/50')
      }
    >
      <span className={'h-3.5 w-3.5 shrink-0 border ' + (selected ? 'border-primary bg-primary' : 'border-muted-foreground/40')} />
      {label}
    </button>
  )
}
