import { ShieldCheck } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { DisputeActions } from '@/components/dispute-actions'

export const dynamic = 'force-dynamic'

interface DisputeRow {
  id: string
  buyer_id: string
  seller_id: string
  repository_id: string
  amount_cents: number
  created_at: string
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

export default async function AdminApprovalsPage() {
  const admin = createAdminClient()

  const { data: raw } = await admin
    .from('purchases')
    .select('id, buyer_id, seller_id, repository_id, amount_cents, created_at')
    .eq('escrow_status', 'disputed')
    .order('created_at', { ascending: true })
  const disputes = (raw as DisputeRow[] | null) ?? []

  // Resolve usernames + repo titles.
  const userIds = [...new Set(disputes.flatMap((d) => [d.buyer_id, d.seller_id]))]
  const repoIds = [...new Set(disputes.map((d) => d.repository_id))]
  const uname = new Map<string, string>()
  const title = new Map<string, string>()
  if (userIds.length > 0) {
    const { data } = await admin.from('users').select('id, username').in('id', userIds)
    for (const u of (data as { id: string; username: string }[] | null) ?? []) uname.set(u.id, u.username)
  }
  if (repoIds.length > 0) {
    const { data } = await admin.from('repositories').select('id, title').in('id', repoIds)
    for (const r of (data as { id: string; title: string }[] | null) ?? []) title.set(r.id, r.title)
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-pixel text-sm">Disputes</h2>
        <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
          Escrows a buyer disputed. Release to the seller, or refund the buyer (then
          return the crypto to them manually — buyers keep file access either way).
        </p>
      </div>

      {disputes.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-border bg-card/40 px-6 py-20 text-center">
          <ShieldCheck className="mb-4 h-10 w-10 text-muted-foreground/30" />
          <p className="font-mono text-xs text-muted-foreground">No open disputes.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {disputes.map((d) => (
            <div key={d.id} className="border-2 border-amber-400/40 bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm text-foreground">{title.get(d.repository_id) ?? 'Repository'}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    buyer @{uname.get(d.buyer_id) ?? '?'} · seller @{uname.get(d.seller_id) ?? '?'} ·{' '}
                    {money(d.amount_cents)} · {new Date(d.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <DisputeActions purchaseId={d.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
