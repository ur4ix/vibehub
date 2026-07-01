'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Mail, Lock, Smartphone, Terminal, CircleCheck, CircleAlert } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelButton } from '@/components/pixel-button'
import { CliTokens } from '@/components/cli-tokens'
import { PayoutSettings } from '@/components/payout-settings'
import { createClient } from '@/lib/supabase/client'

// ─── helpers ─────────────────────────────────────────────────────────────────

type SectionStatus = 'idle' | 'loading' | 'success' | 'error'

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="border-2 border-border bg-card p-6 pixel-shadow-border sm:p-8">
      <div className="mb-6 flex items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-border bg-secondary text-primary">
          {icon}
        </span>
        <div>
          <h2 className="font-pixel text-xs uppercase tracking-wider">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function StatusMsg({ status, message }: { status: SectionStatus; message: string | null }) {
  if (!message || status === 'idle' || status === 'loading') return null
  return (
    <div className={'flex items-center gap-2 font-mono text-xs ' + (status === 'success' ? 'text-primary' : 'text-destructive')}>
      {status === 'success' ? <CircleCheck className="h-4 w-4 shrink-0" /> : <CircleAlert className="h-4 w-4 shrink-0" />}
      {message}
    </div>
  )
}

function InputRow({ id, label, type = 'text', value, onChange, placeholder, autoComplete }: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; autoComplete?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} autoComplete={autoComplete}
        className="border-2 border-input bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
      />
    </div>
  )
}

// ─── Email section ────────────────────────────────────────────────────────────

function EmailSection({ currentEmail }: { currentEmail: string }) {
  const [newEmail, setNewEmail] = useState('')
  const [status, setStatus] = useState<SectionStatus>('idle')
  const [msg, setMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail.trim()) return
    setStatus('loading')
    setMsg(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    if (error) {
      setStatus('error')
      setMsg(error.message)
    } else {
      setStatus('success')
      setMsg(`Confirmation sent to ${newEmail}. Check both inboxes to confirm the change.`)
      setNewEmail('')
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex items-center gap-2 border-2 border-border bg-secondary px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Current email</span>
        <span className="ml-auto font-mono text-xs text-foreground">{currentEmail}</span>
      </div>
      <InputRow
        id="new-email" label="New email address" type="email"
        value={newEmail} onChange={setNewEmail}
        placeholder="new@example.com" autoComplete="email"
      />
      <StatusMsg status={status} message={msg} />
      <PixelButton type="submit" disabled={status === 'loading' || !newEmail.trim()} className="w-full sm:w-auto">
        {status === 'loading' ? 'Sending…' : 'Update email'}
      </PixelButton>
    </form>
  )
}

// ─── Password section ─────────────────────────────────────────────────────────

function PasswordSection({ currentEmail }: { currentEmail: string }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<SectionStatus>('idle')
  const [msg, setMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (next !== confirm) { setStatus('error'); setMsg('New passwords do not match'); return }
    if (next.length < 8) { setStatus('error'); setMsg('New password must be at least 8 characters'); return }
    setStatus('loading')
    setMsg(null)

    const supabase = createClient()
    // Re-authenticate with current password first
    const { error: authError } = await supabase.auth.signInWithPassword({ email: currentEmail, password: current })
    if (authError) {
      setStatus('error')
      setMsg('Current password is incorrect')
      return
    }
    const { error } = await supabase.auth.updateUser({ password: next })
    if (error) {
      setStatus('error')
      setMsg(error.message)
    } else {
      setStatus('success')
      setMsg('Password updated successfully.')
      setCurrent(''); setNext(''); setConfirm('')
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <InputRow id="current-password" label="Current password" type="password"
        value={current} onChange={setCurrent} placeholder="••••••••" autoComplete="current-password" />
      <InputRow id="new-password" label="New password" type="password"
        value={next} onChange={setNext} placeholder="••••••••" autoComplete="new-password" />
      <InputRow id="confirm-password" label="Confirm new password" type="password"
        value={confirm} onChange={setConfirm} placeholder="••••••••" autoComplete="new-password" />
      <StatusMsg status={status} message={msg} />
      <PixelButton type="submit" disabled={status === 'loading' || !current || !next || !confirm} className="w-full sm:w-auto">
        {status === 'loading' ? 'Updating…' : 'Update password'}
      </PixelButton>
    </form>
  )
}

// ─── 2FA section ─────────────────────────────────────────────────────────────

type MfaStep = 'idle' | 'enrolled' | 'enrolling' | 'verifying'

function TwoFactorSection() {
  const [step, setStep] = useState<MfaStep>('idle')
  const [existingFactorId, setExistingFactorId] = useState<string | null>(null)
  const [enrollData, setEnrollData] = useState<{
    id: string
    qr_code: string
    secret: string
  } | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [status, setStatus] = useState<SectionStatus>('idle')
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    async function checkMfa() {
      const supabase = createClient()
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (!error && data?.totp?.length) {
        const verified = data.totp.find((f) => f.status === 'verified')
        if (verified) {
          setExistingFactorId(verified.id)
          setStep('enrolled')
        }
      }
    }
    checkMfa()
  }, [])

  async function startEnroll() {
    setStatus('loading')
    setMsg(null)
    const supabase = createClient()
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Vydex',
      friendlyName: 'Authenticator App',
    })
    setStatus('idle')
    if (error) { setMsg(error.message); setStatus('error'); return }
    setEnrollData({ id: data.id, qr_code: data.totp.qr_code, secret: data.totp.secret })
    setStep('enrolling')
  }

  async function verifyAndConfirm(e: React.FormEvent) {
    e.preventDefault()
    if (!enrollData || !totpCode.trim()) return
    setStatus('loading')
    setMsg(null)
    const supabase = createClient()
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollData.id,
      code: totpCode.trim(),
    })
    if (error) {
      setStatus('error')
      setMsg('Invalid code. Try again.')
      setStatus('error')
    } else {
      setStatus('success')
      setMsg('Two-factor authentication enabled!')
      setExistingFactorId(enrollData.id)
      setStep('enrolled')
      setEnrollData(null)
      setTotpCode('')
    }
  }

  async function disableMfa() {
    if (!existingFactorId) return
    setStatus('loading')
    setMsg(null)
    const supabase = createClient()
    const { error } = await supabase.auth.mfa.unenroll({ factorId: existingFactorId })
    if (error) {
      setStatus('error')
      setMsg(error.message)
    } else {
      setStatus('success')
      setMsg('Two-factor authentication disabled.')
      setExistingFactorId(null)
      setStep('idle')
    }
  }

  if (step === 'enrolled') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 border-2 border-primary bg-primary/10 px-4 py-3">
          <CircleCheck className="h-4 w-4 shrink-0 text-primary" />
          <span className="font-mono text-xs text-primary">2FA is active on your account</span>
        </div>
        <StatusMsg status={status} message={msg} />
        <PixelButton
          variant="outline"
          disabled={status === 'loading'}
          onClick={disableMfa}
          className="border-destructive text-destructive hover:border-destructive hover:text-destructive w-full sm:w-auto"
        >
          {status === 'loading' ? 'Disabling…' : 'Disable 2FA'}
        </PixelButton>
      </div>
    )
  }

  if (step === 'enrolling' && enrollData) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs text-muted-foreground">
            1. Open Google Authenticator or any TOTP app and scan this QR code:
          </p>
          <div className="flex justify-center border-2 border-border bg-white p-4">
            {/* Supabase may return qr_code already as a data: URL, or as raw SVG
                markup — handle both instead of double-wrapping (which broke it).
                It's a data-URL QR code, so next/image can't optimize it anyway. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                enrollData.qr_code.startsWith('data:')
                  ? enrollData.qr_code
                  : `data:image/svg+xml;utf-8,${encodeURIComponent(enrollData.qr_code)}`
              }
              alt="2FA QR code"
              width={200}
              height={200}
              className="block"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Or enter this key manually:
          </p>
          <code className="border-2 border-border bg-secondary px-4 py-3 font-mono text-xs tracking-widest text-primary break-all">
            {enrollData.secret}
          </code>
        </div>
        <form className="flex flex-col gap-4" onSubmit={verifyAndConfirm}>
          <InputRow
            id="totp-code" label="2. Enter the 6-digit code from your app" type="text"
            value={totpCode} onChange={setTotpCode} placeholder="000000" autoComplete="one-time-code"
          />
          <StatusMsg status={status} message={msg} />
          <div className="flex gap-3">
            <PixelButton type="submit" disabled={status === 'loading' || totpCode.length < 6}>
              {status === 'loading' ? 'Verifying…' : 'Verify & enable'}
            </PixelButton>
            <PixelButton type="button" variant="outline" onClick={() => { setStep('idle'); setEnrollData(null) }}>
              Cancel
            </PixelButton>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 border-2 border-border bg-secondary px-4 py-3">
        <CircleAlert className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="font-mono text-xs text-muted-foreground">2FA is not enabled on your account</span>
      </div>
      <StatusMsg status={status} message={msg} />
      <PixelButton disabled={status === 'loading'} onClick={startEnroll} className="w-full sm:w-auto">
        {status === 'loading' ? 'Please wait…' : 'Enable 2FA'}
      </PixelButton>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SecurityPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [checking, setChecking] = useState(true)
  const [wallet, setWallet] = useState<{ userId: string; address: string | null; currency: string | null } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setEmail(session.user.email ?? '')
      const { data } = await supabase.from('users').select('payout_address, payout_currency').eq('id', session.user.id).maybeSingle()
      const u = data as { payout_address: string | null; payout_currency: string | null } | null
      setWallet({ userId: session.user.id, address: u?.payout_address ?? null, currency: u?.payout_currency ?? null })
      setChecking(false)
    })
  }, [router])

  if (checking) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="grid flex-1 place-items-center">
          <p className="font-mono text-sm text-muted-foreground">Loading<span className="blink">_</span></p>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 font-mono text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">~</Link>
          {' / '}
          <Link href="/profile" className="hover:text-primary">profile</Link>
          {' / '}
          <span className="text-foreground">security</span>
        </nav>

        <div className="mb-8">
          <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">
            {'// settings'}
          </span>
          <h1 className="mt-3 font-pixel text-lg flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            Security settings
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Manage your email, password and two-factor authentication.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <Section
            icon={<Mail className="h-5 w-5" />}
            title="Email address"
            description="Change the email address associated with your account. Both addresses will receive a confirmation link."
          >
            <EmailSection currentEmail={email} />
          </Section>

          <Section
            icon={<Lock className="h-5 w-5" />}
            title="Password"
            description="Change your account password. You'll need to enter your current password to confirm."
          >
            <PasswordSection currentEmail={email} />
          </Section>

          <Section
            icon={<Smartphone className="h-5 w-5" />}
            title="Two-factor authentication"
            description="Add an extra layer of security. Use Google Authenticator or any TOTP-compatible app."
          >
            <TwoFactorSection />
          </Section>

          {/* Payout wallet — PayoutSettings is self-contained (its own card + heading). */}
          {wallet
            ? <PayoutSettings userId={wallet.userId} address={wallet.address} currency={wallet.currency} />
            : <div className="border-2 border-border bg-card p-6"><p className="font-mono text-xs text-muted-foreground">Loading wallet…</p></div>}

          <Section
            icon={<Terminal className="h-5 w-5" />}
            title="CLI access tokens"
            description="Personal tokens for the vydex CLI — push a repo or a new version straight into your drafts from the terminal."
          >
            <CliTokens />
          </Section>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
