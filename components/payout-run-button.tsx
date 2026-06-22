'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/pixel-toast'

// Runs the auto-payout engine on demand (same logic as the daily cron).
export function PayoutRunButton() {
  const router = useRouter()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  async function run() {
    if (busy) return
    setBusy(true)
    const res = await fetch('/api/admin/payout/run', { method: 'POST' })
    const json = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return toast.error('Failed', String(json.error ?? 'Try again.'))
    if (json.reason) {
      toast.info('Auto-payouts off', String(json.reason))
      return
    }
    const errors: { id: string; error: string }[] = Array.isArray(json.errors) ? json.errors : []
    if (errors.length > 0) {
      // Surface the actual failure so payout issues are debuggable.
      toast.error(`Payout failed (${errors.length})`, String(errors[0]?.error ?? 'unknown error'))
    } else {
      toast.success(`Paid ${json.paid ?? 0}`, `${json.skipped ?? 0} skipped`)
    }
    router.refresh()
  }

  return (
    <button
      onClick={run}
      disabled={busy}
      className="font-pixel border-2 border-border px-3 py-2 text-[9px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
    >
      {busy ? 'Running…' : 'Run auto-payouts'}
    </button>
  )
}
