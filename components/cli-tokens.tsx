'use client'

import { useEffect, useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { PixelButton } from '@/components/pixel-button'
import { createClient } from '@/lib/supabase/client'

interface Tok {
  id: string
  name: string
  token_prefix: string
  last_used_at: string | null
  created_at: string
}

export function CliTokens() {
  const [tokens, setTokens] = useState<Tok[]>([])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [fresh, setFresh] = useState<string | null>(null) // plaintext shown once
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('api_tokens')
      .select('id, name, token_prefix, last_used_at, created_at')
      .order('created_at', { ascending: false })
    setTokens((data as Tok[] | null) ?? [])
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  async function create() {
    setBusy(true); setError(null); setFresh(null)
    try {
      const res = await fetch('/api/tokens', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || 'CLI token' }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Could not create token'); setBusy(false); return }
      setFresh(json.token)
      setName('')
      await load()
    } catch { setError('Could not create token') }
    setBusy(false)
  }

  async function revoke(id: string) {
    if (!window.confirm('Revoke this token? Any CLI/CI using it will stop working.')) return
    const supabase = createClient()
    await supabase.from('api_tokens').delete().eq('id', id)
    load()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Freshly created token — shown once */}
      {fresh && (
        <div className="border-2 border-primary bg-primary/10 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary">Copy your token now — it won&apos;t be shown again</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate border-2 border-border bg-background px-3 py-2 font-mono text-xs text-foreground">{fresh}</code>
            <PixelButton
              className="shrink-0 gap-1.5 px-3 py-2 text-xs"
              onClick={() => { navigator.clipboard.writeText(fresh); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
            >
              <Copy className="h-3.5 w-3.5" />{copied ? 'Copied' : 'Copy'}
            </PixelButton>
          </div>
        </div>
      )}

      {/* Create */}
      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="token-name" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Token name</label>
          <input
            id="token-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-laptop"
            className="border-2 border-input bg-background px-4 py-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
          />
        </div>
        <PixelButton disabled={busy} onClick={create} className="shrink-0 py-3">
          {busy ? 'Creating…' : 'Generate'}
        </PixelButton>
      </div>
      {error && <p className="font-mono text-xs text-destructive">{error}</p>}

      {/* List */}
      {tokens.length > 0 && (
        <div className="flex flex-col gap-2">
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 border-2 border-border bg-background px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-foreground">{t.name}</p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {t.token_prefix}… · {t.last_used_at ? `used ${new Date(t.last_used_at).toLocaleDateString()}` : 'never used'}
                </p>
              </div>
              <button type="button" onClick={() => revoke(t.id)} aria-label="Revoke token" className="text-muted-foreground transition-colors hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
        Use with the CLI: <code className="text-foreground">npx @vydex/cli login</code> then <code className="text-foreground">vydex push</code> from your repo.
      </p>
    </div>
  )
}
