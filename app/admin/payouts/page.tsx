import { createAdminClient } from '@/lib/supabase/admin'
import { isStableCurrency } from '@/lib/nowpayments-payout'
import { PayoutActions } from '@/components/payout-actions'
import { PayoutCsvButton } from '@/components/payout-csv-button'
import { PayoutRunButton } from '@/components/payout-run-button'
import { WithdrawalActions } from '@/components/withdrawal-actions'

export const dynamic = 'force-dynamic'

interface SaleRow {
  id: string
  seller_id: string
  repository_id: string
  amount_cents: number
  platform_fee_cents: number
  escrow_status: string | null
  payout_status: string | null
  created_at: string
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

export default async function AdminPayoutsPage() {
  const admin = createAdminClient()

  // All paid, completed sales that have cleared escrow.
  const { data: raw } = await admin
    .from('purchases')
    .select('id, seller_id, repository_id, amount_cents, platform_fee_cents, escrow_status, payout_status, created_at')
    .eq('status', 'completed')
    .eq('escrow_status', 'released')
    .gt('amount_cents', 0)
    .order('created_at', { ascending: true })
  const rows = (raw as SaleRow[] | null) ?? []
  const owed = rows.filter((r) => r.payout_status !== 'paid')
  const paidTotal = rows
    .filter((r) => r.payout_status === 'paid')
    .reduce((a, r) => a + (r.amount_cents - r.platform_fee_cents), 0)

  // Resolve sellers (with wallets) and repo titles.
  const sellerIds = [...new Set(owed.map((r) => r.seller_id))]
  const repoIds = [...new Set(owed.map((r) => r.repository_id))]
  const sellers = new Map<string, { username: string; address: string | null; currency: string | null }>()
  const titles = new Map<string, string>()
  if (sellerIds.length > 0) {
    const { data: us } = await admin
      .from('users')
      .select('id, username, payout_address, payout_currency')
      .in('id', sellerIds)
    for (const u of (us as { id: string; username: string; payout_address: string | null; payout_currency: string | null }[] | null) ?? []) {
      sellers.set(u.id, { username: u.username, address: u.payout_address, currency: u.payout_currency })
    }
  }
  if (repoIds.length > 0) {
    const { data: tr } = await admin.from('repositories').select('id, title').in('id', repoIds)
    for (const r of (tr as { id: string; title: string }[] | null) ?? []) titles.set(r.id, r.title)
  }

  // Group owed lines by seller.
  const groups = sellerIds.map((sid) => {
    const items = owed.filter((r) => r.seller_id === sid)
    const total = items.reduce((a, r) => a + (r.amount_cents - r.platform_fee_cents), 0)
    return { sid, seller: sellers.get(sid), items, total }
  })
  const owedTotal = groups.reduce((a, g) => a + g.total, 0)

  // One CSV row per seller that has a wallet (net USD; NOWPayments converts).
  const csvRows = groups
    .filter((g) => g.seller?.address && g.seller?.currency)
    .map((g) => ({ ticker: g.seller!.currency!, address: g.seller!.address!, amount: g.total / 100 }))

  // Pending balance withdrawals (cash-outs) awaiting processing.
  const { data: wRaw } = await admin
    .from('withdrawals')
    .select('id, user_id, amount_cents, address, currency, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  const withdrawals = (wRaw as { id: string; user_id: string; amount_cents: number; address: string; currency: string; status: string; created_at: string }[] | null) ?? []
  const wUserIds = [...new Set(withdrawals.map((w) => w.user_id))]
  const wNames = new Map<string, string>()
  if (wUserIds.length > 0) {
    const { data: wu } = await admin.from('users').select('id, username').in('id', wUserIds)
    for (const u of (wu as { id: string; username: string }[] | null) ?? []) wNames.set(u.id, u.username)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-pixel text-sm">Payouts</h2>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Released sales owed to sellers. Net of the platform fee.
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            Export the CSV, upload it in NOWPayments from your whitelisted IP, then mark rows paid.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PayoutRunButton />
          <PayoutCsvButton rows={csvRows} />
          <div className="border-2 border-primary bg-card px-4 py-2 text-center">
            <div className="font-pixel text-sm text-primary">{money(owedTotal)}</div>
            <div className="mt-1 font-mono text-[9px] uppercase text-muted-foreground">owed</div>
          </div>
          <div className="border-2 border-border bg-card px-4 py-2 text-center">
            <div className="font-pixel text-sm text-green-400">{money(paidTotal)}</div>
            <div className="mt-1 font-mono text-[9px] uppercase text-muted-foreground">paid</div>
          </div>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="border-2 border-dashed border-border p-10 text-center">
          <p className="font-mono text-sm text-muted-foreground">Nothing owed right now.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => {
            const hasWallet = !!g.seller?.address && !!g.seller?.currency
            const stable = hasWallet && isStableCurrency(g.seller!.currency!)
            return (
              <div key={g.sid} className="border-2 border-border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-foreground">@{g.seller?.username ?? 'unknown'}</p>
                    {hasWallet ? (
                      <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                        {g.seller!.currency} · {g.seller!.address}
                      </p>
                    ) : (
                      <p className="mt-0.5 font-mono text-[10px] text-amber-400">No payout wallet set</p>
                    )}
                  </div>
                  <span className="font-pixel text-xs text-primary">{money(g.total)}</span>
                </div>

                <div className="divide-y divide-border">
                  {g.items.map((it) => (
                    <div key={it.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs text-foreground">{titles.get(it.repository_id) ?? 'Repository'}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {money(it.amount_cents - it.platform_fee_cents)} net · {new Date(it.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {it.payout_status === 'pending' && (
                          <span className="font-pixel text-[8px] uppercase text-amber-400">awaiting code</span>
                        )}
                        <PayoutActions purchaseId={it.id} canAuto={stable} pending={it.payout_status === 'pending'} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Balance withdrawals (cash-outs) */}
      <div className="mt-12">
        <h2 className="font-pixel text-sm">Withdrawals</h2>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          Pending balance cash-outs. Amounts are already debited from the user&apos;s balance.
          &ldquo;Send&rdquo; pushes via NOWPayments; &ldquo;Reject&rdquo; credits the balance back.
        </p>

        {withdrawals.length === 0 ? (
          <div className="mt-5 border-2 border-dashed border-border p-10 text-center">
            <p className="font-mono text-sm text-muted-foreground">No pending withdrawals.</p>
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-2">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 border-2 border-border bg-card px-5 py-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm text-foreground">
                    @{wNames.get(w.user_id) ?? 'unknown'} · <span className="text-primary">{money(w.amount_cents)}</span>
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                    {w.currency} · {w.address} · {new Date(w.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <WithdrawalActions withdrawalId={w.id} canAuto={isStableCurrency(w.currency)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
