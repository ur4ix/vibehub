'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/pixel-toast'

// NOWPayments payout currencies. Ticker is what the Payout API expects.
const CURRENCIES: { ticker: string; label: string }[] = [
  { ticker: 'usdttrc20', label: 'USDT · Tron (TRC-20)' },
  { ticker: 'usdtbsc', label: 'USDT · BNB Smart Chain (BEP-20)' },
  { ticker: 'usdtsol', label: 'USDT · Solana' },
  { ticker: 'usdtmatic', label: 'USDT · Polygon' },
  { ticker: 'usdcsol', label: 'USDC · Solana' },
  { ticker: 'usdterc20', label: 'USDT · Ethereum (ERC-20)' },
  { ticker: 'btc', label: 'Bitcoin' },
  { ticker: 'eth', label: 'Ethereum' },
  { ticker: 'sol', label: 'Solana' },
]

export function PayoutSettings({
  userId,
  address,
  currency,
}: {
  userId: string
  address: string | null
  currency: string | null
}) {
  const toast = useToast()
  const [addr, setAddr] = useState(address ?? '')
  const [cur, setCur] = useState(currency ?? 'usdttrc20')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  async function save() {
    if (saving) return
    const trimmed = addr.trim()
    if (!trimmed) {
      toast.error('Address required', 'Enter the wallet that should receive payouts.')
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({ payout_address: trimmed, payout_currency: cur })
      .eq('id', userId)
    setSaving(false)
    if (error) {
      toast.error('Could not save', error.message)
      return
    }
    setDirty(false)
    toast.success('Payout wallet saved', 'Released sales will be paid here.')
  }

  return (
    <div className="border-2 border-border bg-card p-5">
      <p className="mb-1 font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">
        Payout wallet
      </p>
      <p className="mb-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
        Where your released sales are paid (minus the platform fee). Crypto only —
        double-check the address and network.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={cur}
          onChange={(e) => { setCur(e.target.value); setDirty(true) }}
          className="border-2 border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:border-primary focus:outline-none sm:w-56"
        >
          {CURRENCIES.map((c) => (
            <option key={c.ticker} value={c.ticker}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          value={addr}
          onChange={(e) => { setAddr(e.target.value); setDirty(true) }}
          placeholder="Wallet address"
          spellCheck={false}
          className="min-w-0 flex-1 border-2 border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="font-pixel inline-flex items-center justify-center border-2 px-4 py-2 text-[9px] uppercase leading-none tracking-wider border-primary bg-primary text-primary-foreground transition-all duration-100 hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save wallet'}
        </button>
        {address && !dirty && (
          <span className="font-mono text-[10px] text-green-400">Saved</span>
        )}
      </div>
    </div>
  )
}
