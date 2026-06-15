'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PixelButton } from '@/components/pixel-button'
import { createClient } from '@/lib/supabase/client'

export function AuthCard() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()

  // Pre-fill email from CTA form
  useEffect(() => {
    const prefill = searchParams.get('email')
    if (prefill) {
      setEmail(prefill)
      setMode('register')
    }
  }, [searchParams])

  async function handleGitHub() {
    setIsLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${location.origin}/auth/callback?next=/dashboard`,
      },
    })
    if (error) { setError(error.message); setIsLoading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(
          error.message === 'Invalid login credentials'
            ? 'Invalid email or password'
            : error.message
        )
        setIsLoading(false)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback?next=/dashboard`,
          data: { username: username.trim() || email.split('@')[0] },
        },
      })
      setIsLoading(false)
      if (error) { setError(error.message); return }
      setMessage('Confirmation email sent. Check your inbox.')
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <Link
        href="/"
        className="mb-8 flex items-center justify-center gap-3"
        aria-label="Vydex — home"
      >
        <span
          className="grid h-8 w-8 place-items-center border-2 border-primary bg-primary text-primary-foreground"
          aria-hidden="true"
        >
          <span className="font-pixel text-[12px]">{'>'}</span>
        </span>
        <span className="font-pixel text-xs tracking-tight">Vydex</span>
      </Link>

      <div className="border-2 border-border bg-card p-6 pixel-shadow-border sm:p-8">
        {/* Tabs */}
        <div className="grid grid-cols-2 border-2 border-border" role="tablist" aria-label="Sign in or register">
          {(['login', 'register'] as const).map((m, i) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => { setMode(m); setError(null); setMessage(null) }}
              className={
                'font-pixel py-3 text-[9px] uppercase tracking-wider transition-colors ' +
                (i > 0 ? 'border-l-2 border-border ' : '') +
                (mode === m
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-transparent text-muted-foreground hover:text-foreground')
              }
            >
              {m === 'login' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        <h1 className="mt-7 text-balance font-pixel text-sm leading-[1.6]">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {mode === 'login'
            ? 'Sign in to continue building on vibes.'
            : 'Register and publish your projects in minutes.'}
        </p>

        {/* GitHub */}
        <button
          type="button"
          onClick={handleGitHub}
          disabled={isLoading}
          className="mt-7 flex w-full items-center justify-center gap-3 border-2 border-border bg-secondary px-5 py-3 text-sm transition-all duration-100 pixel-shadow-border hover:border-primary hover:text-primary active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
        >
          <GitHubIcon className="h-5 w-5" />
          <span className="font-pixel text-[10px] uppercase tracking-wider">
            Continue with GitHub
          </span>
        </button>

        {/* Divider */}
        <div className="my-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            or with email
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Form */}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="flex flex-col gap-2">
              <label htmlFor="username" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                pattern="[a-z0-9_]{3,30}"
                title="3–30 chars: lowercase, digits, underscore"
                className="border-2 border-input bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="auth-email" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="border-2 border-input bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="auth-password" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="border-2 border-input bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
            />
          </div>

          {error && (
            <p role="alert" className="font-mono text-xs text-destructive">
              {error}
            </p>
          )}
          {message && (
            <p className="font-mono text-xs text-primary">{message}</p>
          )}

          <PixelButton type="submit" disabled={isLoading} className="mt-2 w-full">
            {isLoading
              ? 'Please wait…'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </PixelButton>
        </form>
      </div>

      <p className="mt-6 text-center text-sm leading-relaxed text-muted-foreground">
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setMessage(null) }}
          className="text-primary underline-offset-4 hover:underline"
        >
          {mode === 'login' ? 'Register' : 'Sign in'}
        </button>
      </p>
    </div>
  )
}

function GitHubIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}
