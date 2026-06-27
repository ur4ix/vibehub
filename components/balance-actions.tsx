'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Send } from 'lucide-react'
import { PixelButton } from '@/components/pixel-button'
import { useToast } from '@/components/pixel-toast'

type Mode = null | 'topup' | 'withdraw'

export function BalanceActions({ balanceCents, hasWallet }: { balanceCents: number; hasWallet: boolean }) {
  const router = useRouter()
  const toast = useToast()
  const [mode, setMode] = useState<Mode>(null)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)

  async function topup() {
    const amt = Number(amount)
    if (!(amt >= 5)) { toast.error('Minimum top-up is $5'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/balance/topup', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amountUsd: amt }),
      })
      const json = await res.json()
      if (json.url) { window.location.href = json.url; return }
      toast.error('Top-up unavailable', json.error ?? 'Try again later.')
    } catch { toast.error('Top-up failed', 'Try again later.') }
    setBusy(false)
  }

  async function withdraw() {
    const amt = Number(amount)
    if (!(amt >= 5)) { toast.error('Minimum withdrawal is $5'); return }
    if (amt * 100 > balanceCents) { toast.error('Amount exceeds your balance'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/balance/withdraw', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amountUsd: amt }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error('Withdrawal failed', json.error ?? 'Try again later.'); setBusy(false); return }
      toast.success(
        json.status === 'sent' ? 'Withdrawal sent' : 'Withdrawal requested',
        json.status === 'sent' ? 'The crypto is on its way.' : 'It will be processed shortly.',
      )
      setMode(null); setAmount(''); router.refresh()
    } catch { toast.error('Withdrawal failed', 'Try again later.') }
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <PixelButton className="gap-1.5 px-4 py-2 text-xs" onClick={() => { setMode(mode === 'topup' ? null : 'topup'); setAmount('') }}>
          <Plus className="h-3.5 w-3.5" /> Top up
        </PixelButton>
        <PixelButton
          variant="outline"
          className="gap-1.5 px-4 py-2 text-xs"
          onClick={() => {
            if (!hasWallet) { toast.info('Add a payout wallet', 'Set your wallet below to withdraw.'); return }
            setMode(mode === 'withdraw' ? null : 'withdraw'); setAmount('')
          }}
        >
          <Send className="h-3.5 w-3.5" /> Withdraw
        </PixelButton>
      </div>

      {mode && (
        <div className="flex items-center gap-2">
          <div className="flex border-2 border-input bg-background focus-within:border-primary">
            <span className="flex items-center border-r border-border bg-secondary px-3 font-mono text-[11px] text-muted-foreground">$</span>
            <input
              type="number" min={5} step="0.01" value={amount} autoFocus
              onChange={(e) => setAmount(e.target.value)}
              placeholder={mode === 'topup' ? '25.00' : (balanceCents / 100).toFixed(2)}
              className="w-32 bg-transparent px-3 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          <PixelButton
            className="px-4 py-2 text-xs"
            disabled={busy}
            onClick={mode === 'topup' ? topup : withdraw}
          >
            {busy ? '…' : mode === 'topup' ? 'Continue' : 'Request'}
          </PixelButton>
        </div>
      )}
    </div>
  )
}
