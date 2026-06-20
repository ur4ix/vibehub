'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/pixel-toast'

// Per-payout admin controls.
//   • Mark paid (manual): record a payout you sent yourself.
//   • Send (NOWPayments): two steps — create the batch (NOWPayments emails a
//     2FA code), then enter that code to verify and send. Auto-pay shows only
//     when the seller has a stablecoin wallet.
export function PayoutActions({
  purchaseId,
  canAuto,
  pending,
}: {
  purchaseId: string
  canAuto: boolean
  pending: boolean // a NOWPayments batch was already created, awaiting the code
}) {
  const router = useRouter()
  const toast = useToast()
  // 'manual' = ref input, 'verify' = 2FA code input, null = idle buttons.
  const [open, setOpen] = useState<null | 'manual' | 'verify'>(pending ? 'verify' : null)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  async function call(payload: Record<string, unknown>): Promise<{ ok: boolean; json: Record<string, unknown> }> {
    const res = await fetch('/api/admin/payout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ purchaseId, ...payload }),
    })
    const json = await res.json().catch(() => ({}))
    return { ok: res.ok, json }
  }

  async function markPaid() {
    if (busy) return
    setBusy(true)
    const { ok, json } = await call({ mode: 'manual', ref: value.trim() })
    setBusy(false)
    if (!ok) return toast.error('Failed', String(json.error ?? 'Try again.'))
    toast.success('Marked paid')
    reset(); router.refresh()
  }

  // Step 1: create the batch → NOWPayments emails the code.
  async function createBatch() {
    if (busy) return
    setBusy(true)
    const { ok, json } = await call({ mode: 'nowpayments', action: 'create' })
    setBusy(false)
    if (!ok) return toast.error('Failed', String(json.error ?? 'Try again.'))
    toast.success('Batch created', 'NOWPayments emailed a 2FA code — enter it.')
    setOpen('verify')
    router.refresh()
  }

  // Step 2: verify with the emailed code → it sends.
  async function verify() {
    if (busy || !value.trim()) return
    setBusy(true)
    const { ok, json } = await call({ mode: 'nowpayments', action: 'verify', code: value.trim() })
    setBusy(false)
    if (!ok) return toast.error('Verification failed', String(json.error ?? 'Check the code.'))
    toast.success('Paid', json.ref ? `Batch ${json.ref}` : undefined)
    reset(); router.refresh()
  }

  function reset() { setOpen(null); setValue('') }

  if (open === 'manual' || open === 'verify') {
    const isVerify = open === 'verify'
    return (
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isVerify ? '2FA code from email' : 'tx hash (optional)'}
          autoFocus
          spellCheck={false}
          className="w-40 border-2 border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:border-primary focus:outline-none"
        />
        <button
          onClick={isVerify ? verify : markPaid}
          disabled={busy || (isVerify && !value.trim())}
          className="font-pixel border-2 border-primary bg-primary px-2.5 py-1.5 text-[8px] uppercase text-primary-foreground transition-all hover:brightness-110 disabled:opacity-40"
        >
          {busy ? '…' : isVerify ? 'Verify' : 'Confirm'}
        </button>
        <button
          onClick={reset}
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
          onClick={createBatch}
          disabled={busy}
          className="font-pixel border-2 border-primary bg-primary px-2.5 py-1.5 text-[8px] uppercase text-primary-foreground transition-all hover:brightness-110 disabled:opacity-40"
        >
          {busy ? '…' : 'Send (NOWPayments)'}
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
