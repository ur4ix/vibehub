import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { BalanceActions } from '@/components/balance-actions'
import type { Profile } from '@/types/database'

export const metadata: Metadata = {
  title: 'Wallet',
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

export default async function WalletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profileRaw } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle()
  const profile = profileRaw as Profile | null
  const balanceCents = profile?.balance_cents ?? 0
  const hasWallet = Boolean(profile?.payout_address && profile?.payout_currency)

  // Ledger history.
  const { data: ledgerRaw } = await supabase
    .from('balance_entries')
    .select('id, amount_cents, type, memo, created_at')
    .order('created_at', { ascending: false })
    .limit(30)
  const ledger = (ledgerRaw as { id: string; amount_cents: number; type: string; memo: string | null; created_at: string }[] | null) ?? []

  // Earnings (repo sales) — escrow / ready / paid.
  const { data: saleRaw } = await supabase
    .from('purchases')
    .select('id, repository_id, amount_cents, platform_fee_cents, escrow_status, payout_status, created_at')
    .eq('seller_id', user.id)
    .eq('status', 'completed')
    .gt('amount_cents', 0)
    .order('created_at', { ascending: false })
  type SaleRow = {
    id: string; repository_id: string; amount_cents: number; platform_fee_cents: number
    escrow_status: string | null; payout_status: string | null; created_at: string
  }
  const saleRows = (saleRaw as SaleRow[] | null) ?? []
  const net = (s: SaleRow) => s.amount_cents - s.platform_fee_cents
  const heldTotal = saleRows.filter((s) => s.escrow_status === 'held').reduce((a, s) => a + net(s), 0)
  const disputedTotal = saleRows.filter((s) => s.escrow_status === 'disputed').reduce((a, s) => a + net(s), 0)
  const inEscrowTotal = heldTotal + disputedTotal
  const owedTotal = saleRows.filter((s) => s.escrow_status === 'released' && s.payout_status !== 'paid').reduce((a, s) => a + net(s), 0)
  const paidTotal = saleRows.filter((s) => s.payout_status === 'paid').reduce((a, s) => a + net(s), 0)
  const hasSales = saleRows.length > 0

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <nav className="mb-8 font-mono text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">~</Link>
          {' / '}
          <Link href="/dashboard" className="hover:text-primary">dashboard</Link>
          {' / '}
          <span className="text-foreground">wallet</span>
        </nav>

        <div className="mb-8">
          <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// wallet'}</span>
          <h1 className="mt-3 font-pixel text-lg">Wallet</h1>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Your balance, earnings and transaction history.
          </p>
        </div>

        {/* Balance */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-primary bg-card px-5 py-4">
            <div>
              <div className="font-pixel text-lg text-primary">{money(balanceCents)}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">available balance</div>
            </div>
            <BalanceActions balanceCents={balanceCents} hasWallet={hasWallet} />
          </div>
          {!hasWallet && (
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">
              Set a payout wallet in <Link href="/settings/security" className="text-primary hover:underline">Security settings</Link> before withdrawing.
            </p>
          )}
        </div>

        {/* Earnings */}
        {hasSales && (
          <div className="mb-10">
            <h2 className="mb-5 font-pixel text-xs uppercase tracking-wider">Earnings</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="border-2 border-border bg-card px-4 py-3">
                <div className="font-pixel text-sm text-amber-400">{money(inEscrowTotal)}</div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">in escrow</div>
                {disputedTotal > 0 && <div className="mt-1 font-mono text-[9px] text-amber-400/80">incl. {money(disputedTotal)} in dispute</div>}
              </div>
              <div className="border-2 border-primary bg-card px-4 py-3">
                <div className="font-pixel text-sm text-primary">{money(owedTotal)}</div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">clearing to balance</div>
              </div>
              <div className="border-2 border-border bg-card px-4 py-3">
                <div className="font-pixel text-sm text-green-400">{money(paidTotal)}</div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">settled</div>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <h2 className="mb-5 font-pixel text-xs uppercase tracking-wider">History</h2>
          {ledger.length === 0 ? (
            <div className="border-2 border-dashed border-border p-10 text-center">
              <p className="font-mono text-sm text-muted-foreground">No transactions yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {ledger.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-4 border-2 border-border bg-card px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-foreground">{e.memo ?? e.type}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={'shrink-0 font-pixel text-[10px] ' + (e.amount_cents >= 0 ? 'text-green-400' : 'text-muted-foreground')}>
                    {e.amount_cents >= 0 ? '+' : '−'}{money(Math.abs(e.amount_cents))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
