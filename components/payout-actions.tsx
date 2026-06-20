'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/pixel-toast'

// Per-payout admin controls: mark a payout as paid manually, or send it via the
// NOWPayments Payout API (which needs a 2FA code). Auto-pay is only offered when
// the seller has a stablecoin payout wallet.
export function PayoutActions({
  purchaseId,
  canAuto,
}: {
  purchaseId: string
  canAuto: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const [open, setOpen] = useState<null | 'manual' | 'auto'>(null)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(mode: 'manual' | 'nowpayments') {
    if (busy) return
    setBusy(true)
    const res = await fetch('/api/admin/payout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        purchaseId,
        mode,
        ref: mode === 'manual' ? value.trim() : undefined,
        code: mode === 'nowpayments' ? value.trim() : undefined,
      }),
    })
    const json = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      toast.error('Payout failed', json?.error ?? 'Try again.')
      return
    }
    toast.success('Marked paid', json?.ref ? `Ref: ${json.ref}` : undefined)
    setOpen(null)
    setValue('')
    router.refresh()
  }

  if (open) {
    const isAuto = open === 'auto'
    return (
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isAuto ? '2FA code' : 'tx hash (optional)'}
          autoFocus
          spellCheck={false}
          className="w-36 border-2 border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:border-primary focus:outline-none"
        />
        <button
          onClick={() => submit(isAuto ? 'nowpayments' : 'manual')}
          disabled={busy || (isAuto && !value.trim())}
          className="font-pixel border-2 border-primary bg-primary px-2.5 py-1.5 text-[8px] uppercase text-primary-foreground transition-all hover:brightness-110 disabled:opacity-40"
        >
          {busy ? '…' : 'Confirm'}
        </button>
        <button
          onClick={() => { setOpen(null); setValue('') }}
          disabled={busy}
          className="font-pixel border-2 border-border px-2.5 py-1.5 text-[8px] uppercase text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {canAuto && (
        <button
          onClick={() => setOpen('auto')}
          className="font-pixel border-2 border-primary bg-primary px-2.5 py-1.5 text-[8px] uppercase text-primary-foreground transition-all hover:brightness-110"
        >
          Send (NOWPayments)
        </button>
      )}
      <button
        onClick={() => setOpen('manual')}
        className="font-pixel border-2 border-border px-2.5 py-1.5 text-[8px] uppercase text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        Mark paid
      </button>
    </div>
  )
}
