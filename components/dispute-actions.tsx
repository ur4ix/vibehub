'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/pixel-toast'

// Staff control for a disputed escrow: release to the seller, or refund the buyer.
export function DisputeActions({ purchaseId }: { purchaseId: string }) {
  const router = useRouter()
  const toast = useToast()
  const [busy, setBusy] = useState<null | 'release' | 'refund'>(null)

  async function resolve(action: 'release' | 'refund') {
    if (busy) return
    const verb = action === 'refund' ? 'Refund the buyer' : 'Release to the seller'
    if (!window.confirm(`${verb}? This resolves the dispute.`)) return
    setBusy(action)
    const res = await fetch('/api/admin/dispute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ purchaseId, action }),
    })
    const json = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) return toast.error('Failed', String(json.error ?? 'Try again.'))
    toast.success(action === 'refund' ? 'Refunded buyer' : 'Released to seller')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => resolve('release')}
        disabled={!!busy}
        className="font-pixel border-2 border-green-400/50 px-2.5 py-1.5 text-[8px] uppercase text-green-400 transition-colors hover:bg-green-400/10 disabled:opacity-40"
      >
        {busy === 'release' ? '…' : 'Release to seller'}
      </button>
      <button
        onClick={() => resolve('refund')}
        disabled={!!busy}
        className="font-pixel border-2 border-destructive/50 px-2.5 py-1.5 text-[8px] uppercase text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
      >
        {busy === 'refund' ? '…' : 'Refund buyer'}
      </button>
    </div>
  )
}
