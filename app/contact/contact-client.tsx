'use client'

import { useState } from 'react'
import { Mail, MessageSquare, Github, Twitter } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelButton } from '@/components/pixel-button'

const CHANNELS = [
  {
    icon: <Mail className="h-5 w-5" />,
    title: 'Email',
    value: 'hi@vibehub.dev',
    href: 'mailto:hi@vibehub.dev',
    desc: 'For general questions, partnerships and press.',
  },
  {
    icon: <MessageSquare className="h-5 w-5" />,
    title: 'Discord',
    value: 'discord.gg/vibehub',
    href: '#',
    desc: 'Live community chat, support, and off-topic vibes.',
  },
  {
    icon: <Github className="h-5 w-5" />,
    title: 'GitHub',
    value: 'github.com/vibehub',
    href: '#',
    desc: 'Report bugs, request features, or contribute.',
  },
  {
    icon: <Twitter className="h-5 w-5" />,
    title: 'X / Twitter',
    value: '@vibehub_dev',
    href: '#',
    desc: 'Product updates, launches and community highlights.',
  },
]

function Field({ id, label, type = 'text', value, onChange, placeholder, required }: {
  id: string; label: string; type?: string; value: string
  onChange: (v: string) => void; placeholder?: string; required?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="border-2 border-input bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
      />
    </div>
  )
}

export function ContactPageClient() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="relative border-b-2 border-border">
          <div className="pixel-grid absolute inset-0 opacity-30" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">// contact</span>
            <h1 className="mt-5 font-pixel text-2xl leading-[1.4]">Get in touch</h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
              Have a question, a partnership idea, or just want to say hello? We read every message.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
            {/* Form */}
            <div>
              <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">// send a message</span>

              {sent ? (
                <div className="mt-6 border-2 border-primary bg-primary/10 p-8 text-center">
                  <span className="font-pixel text-3xl text-primary">✓</span>
                  <h2 className="mt-4 font-pixel text-sm">Message sent!</h2>
                  <p className="mt-3 font-mono text-sm text-muted-foreground">
                    We&apos;ll get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => { setSent(false); setName(''); setEmail(''); setSubject(''); setMessage('') }}
                    className="mt-6 font-mono text-xs text-primary hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit}>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="name" label="Your name" value={name} onChange={setName} placeholder="Vibe Coder" required />
                    <Field id="email" label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
                  </div>
                  <Field id="subject" label="Subject" value={subject} onChange={setSubject} placeholder="Partnership / Bug / Question…" required />
                  <div className="flex flex-col gap-2">
                    <label htmlFor="message" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      Message
                    </label>
                    <textarea
                      id="message" rows={6} value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us what&apos;s on your mind…"
                      required
                      className="resize-none border-2 border-input bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
                    />
                  </div>
                  <PixelButton type="submit" className="self-start px-8">Send message</PixelButton>
                </form>
              )}
            </div>

            {/* Channels */}
            <div>
              <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">// other channels</span>
              <div className="mt-6 flex flex-col gap-4">
                {CHANNELS.map((c) => (
                  <a
                    key={c.title}
                    href={c.href}
                    className="group flex items-start gap-4 border-2 border-border bg-card p-5 transition-all duration-100 hover:border-primary pixel-shadow-border"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-border bg-secondary text-primary">
                      {c.icon}
                    </span>
                    <div>
                      <p className="font-pixel text-[10px] uppercase tracking-wider group-hover:text-primary">{c.title}</p>
                      <p className="mt-1 font-mono text-xs text-primary">{c.value}</p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
                    </div>
                  </a>
                ))}
              </div>

              <div className="mt-8 border-2 border-border bg-secondary p-5">
                <p className="font-pixel text-[9px] uppercase tracking-wider">Response times</p>
                <ul className="mt-4 space-y-3 font-mono text-xs text-muted-foreground">
                  <li className="flex justify-between"><span>Email</span><span className="text-primary">{'< 24 hours'}</span></li>
                  <li className="flex justify-between"><span>Discord</span><span className="text-primary">{'< 2 hours'}</span></li>
                  <li className="flex justify-between"><span>GitHub issues</span><span className="text-primary">{'< 48 hours'}</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
