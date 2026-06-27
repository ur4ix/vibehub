'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PixelButton } from '@/components/pixel-button'
import { useToast } from '@/components/pixel-toast'

export function WithdrawalActions({ withdrawalId, canAuto }: { withdrawalId: string; canAuto: boolean }) {
  const router = useRouter()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  async function run(action: 'send' | 'manual' | 'reject') {
    if (action === 'reject' && !window.confirm('Reject this withdrawal and credit the balance back?')) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/withdrawal', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ withdrawalId, action }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error('Failed', json.error ?? 'Try again.'); setBusy(false); return }
      toast.success(action === 'reject' ? 'Rejected & refunded' : 'Marked sent')
      router.refresh()
    } catch { toast.error('Failed', 'Try again.'); setBusy(false) }
  }

  return (
    <div className="flex items-center gap-2">
      {canAuto && (
        <PixelButton className="px-3 py-1.5 text-[10px]" disabled={busy} onClick={() => run('send')}>Send</PixelButton>
      )}
      <PixelButton variant="outline" className="px-3 py-1.5 text-[10px]" disabled={busy} onClick={() => run('manual')}>Mark sent</PixelButton>
      <button
        type="button" disabled={busy} onClick={() => run('reject')}
        className="font-mono text-[10px] text-muted-foreground hover:text-destructive disabled:opacity-60"
      >
        Reject
      </button>
    </div>
  )
}
