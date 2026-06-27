import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PayoutSettings } from '@/components/payout-settings'
import type { Profile, DashboardRepo } from '@/types/database'

export const metadata: Metadata = {
  title: 'Dashboard',
}

interface DashJob {
  id: string
  title: string
  budget_type: 'fixed' | 'equity' | 'hourly'
  budget_value: number
  status: 'open' | 'closed'
  created_at: string
}
interface DashOrder {
  id: string
  title: string
  budget: number
  status: string
  created_at: string
}

function jobBudget(t: DashJob['budget_type'], v: number) {
  return t === 'fixed' ? `$${v}` : t === 'equity' ? `${v}%` : `$${v}/h`
}

// Shared status badge colours for jobs + orders (border + text, compact).
function statusBadge(status: string) {
  switch (status) {
    case 'open':        return 'border-primary text-primary'
    case 'in_progress': return 'border-blue-400/50 text-blue-400'
    case 'review':      return 'border-amber-400/50 text-amber-400'
    case 'completed':   return 'border-green-400/50 text-green-400'
    default:            return 'border-border text-muted-foreground' // closed / cancelled
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profileRaw } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  const profile = profileRaw as Profile | null

  const { data: reposRaw } = await supabase
    .from('repositories')
    .select('id, title, slug, type, price_cents, is_published, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
  const repos = reposRaw as DashboardRepo[] | null

  const { data: jobsRaw } = await supabase
    .from('jobs')
    .select('id, title, budget_type, budget_value, status, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
  const jobs = jobsRaw as DashJob[] | null

  const { data: ordersRaw } = await supabase
    .from('orders')
    .select('id, title, budget, status, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
  const orders = ordersRaw as DashOrder[] | null

  // Purchases (your library) — completed buys, with repo + seller for the link.
  const { data: purRaw } = await supabase
    .from('purchases')
    .select('id, repository_id, amount_cents, escrow_status, created_at')
    .eq('buyer_id', user.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
  const purRows = (purRaw as { id: string; repository_id: string; amount_cents: number; escrow_status: string | null; created_at: string }[] | null) ?? []
  const purchasedRepoMap = new Map<string, { id: string; title: string; slug: string; owner_id: string }>()
  const purchaseOwnerMap = new Map<string, string>()
  if (purRows.length > 0) {
    const repoIds = [...new Set(purRows.map((p) => p.repository_id))]
    const { data: pr } = await supabase.from('repositories').select('id, title, slug, owner_id').in('id', repoIds)
    for (const r of (pr as { id: string; title: string; slug: string; owner_id: string }[] | null) ?? []) purchasedRepoMap.set(r.id, r)
    const ownerIds = [...new Set([...purchasedRepoMap.values()].map((r) => r.owner_id))]
    if (ownerIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, username').in('id', ownerIds)
      for (const p of (profs as { id: string; username: string }[] | null) ?? []) purchaseOwnerMap.set(p.id, p.username)
    }
  }
  const purchases = purRows
    .map((p) => ({ ...p, repo: purchasedRepoMap.get(p.repository_id) }))
    .filter((p) => p.repo)

  // Earnings (seller side) — paid sales of your repos, with escrow + payout state.
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
  // Resolve titles for the sold repos (owner is you, so they're readable).
  const saleRepoTitle = new Map<string, string>()
  if (saleRows.length > 0) {
    const ids = [...new Set(saleRows.map((s) => s.repository_id))]
    const { data: tr } = await supabase.from('repositories').select('id, title').in('id', ids)
    for (const r of (tr as { id: string; title: string }[] | null) ?? []) saleRepoTitle.set(r.id, r.title)
  }
  // Internal balance + recent ledger history.
  const balanceCents = profile?.balance_cents ?? 0
  const { data: ledgerRaw } = await supabase
    .from('balance_entries')
    .select('id, amount_cents, type, memo, created_at')
    .order('created_at', { ascending: false })
    .limit(8)
  const ledger = (ledgerRaw as { id: string; amount_cents: number; type: string; memo: string | null; created_at: string }[] | null) ?? []

  const net = (s: SaleRow) => s.amount_cents - s.platform_fee_cents
  // Funds still in escrow = held OR disputed (a dispute doesn't make them vanish,
  // it just freezes them pending a moderator decision).
  const heldTotal = saleRows.filter((s) => s.escrow_status === 'held').reduce((a, s) => a + net(s), 0)
  const disputedTotal = saleRows.filter((s) => s.escrow_status === 'disputed').reduce((a, s) => a + net(s), 0)
  const inEscrowTotal = heldTotal + disputedTotal
  const owed = saleRows.filter((s) => s.escrow_status === 'released' && s.payout_status !== 'paid')
  const owedTotal = owed.reduce((a, s) => a + net(s), 0)
  const paidTotal = saleRows.filter((s) => s.payout_status === 'paid').reduce((a, s) => a + net(s), 0)
  const hasSales = saleRows.length > 0
  const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">
              {'// dashboard'}
            </span>
            <h1 className="mt-3 font-pixel text-lg">
              {profile?.display_name ?? profile?.username ?? user.email}
            </h1>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              @{profile?.username} · reputation {profile?.reputation ?? 0}
            </p>
          </div>
          <Link
            href="/explore/new"
            className="font-pixel inline-flex items-center justify-center gap-2 border-2 px-5 py-3 text-[10px] uppercase leading-none tracking-wider border-primary bg-primary text-primary-foreground pixel-shadow-border transition-all duration-100 hover:brightness-110 active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            + Publish
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-10">
          <div className="border-2 border-border bg-card px-4 py-3 text-center">
            <div className="font-pixel text-sm text-primary">{repos?.length ?? 0}</div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">repos</div>
          </div>
          <div className="border-2 border-border bg-card px-4 py-3 text-center">
            <div className="font-pixel text-sm text-primary">
              {repos?.filter((r) => r.is_published).length ?? 0}
            </div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">published</div>
          </div>
          <div className="border-2 border-border bg-card px-4 py-3 text-center">
            <div className="font-pixel text-sm text-primary">{profile?.reputation ?? 0}</div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">reputation</div>
          </div>
        </div>

        {/* Internal balance */}
        <div className="mb-12">
          <h2 className="mb-5 font-pixel text-xs uppercase tracking-wider">Balance</h2>
          <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-primary bg-card px-5 py-4">
            <div>
              <div className="font-pixel text-lg text-primary">{money(balanceCents)}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">available balance</div>
            </div>
            <p className="max-w-xs font-mono text-[10px] leading-relaxed text-muted-foreground">
              Sales credit your balance once they clear escrow. Withdrawals to crypto are coming soon.
            </p>
          </div>
          {ledger.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {ledger.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-4 border-2 border-border bg-card px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs capitalize text-foreground">{e.type}</p>
                    {e.memo && <p className="truncate font-mono text-[10px] text-muted-foreground">{e.memo}</p>}
                  </div>
                  <span className={'shrink-0 font-pixel text-[10px] ' + (e.amount_cents >= 0 ? 'text-green-400' : 'text-muted-foreground')}>
                    {e.amount_cents >= 0 ? '+' : '−'}{money(Math.abs(e.amount_cents))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Earnings (seller payouts) */}
        <div className="mb-12">
          <h2 className="mb-5 font-pixel text-xs uppercase tracking-wider">Earnings</h2>

          {hasSales && (
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="border-2 border-border bg-card px-4 py-3">
                <div className="font-pixel text-sm text-amber-400">{money(inEscrowTotal)}</div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">in escrow</div>
                {disputedTotal > 0 && (
                  <div className="mt-1 font-mono text-[9px] text-amber-400/80">incl. {money(disputedTotal)} in dispute</div>
                )}
              </div>
              <div className="border-2 border-primary bg-card px-4 py-3">
                <div className="font-pixel text-sm text-primary">{money(owedTotal)}</div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">ready to pay out</div>
              </div>
              <div className="border-2 border-border bg-card px-4 py-3">
                <div className="font-pixel text-sm text-green-400">{money(paidTotal)}</div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">paid out</div>
              </div>
            </div>
          )}

          <PayoutSettings
            userId={user.id}
            address={profile?.payout_address ?? null}
            currency={profile?.payout_currency ?? null}
          />

          {owed.length > 0 && (
            <div className="mt-5">
              <p className="mb-3 font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">
                Ready to pay out
              </p>
              <div className="flex flex-col gap-2">
                {owed.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-4 border-2 border-border bg-card px-5 py-3">
                    <p className="min-w-0 truncate font-mono text-sm text-foreground">
                      {saleRepoTitle.get(s.repository_id) ?? 'Repository'}
                    </p>
                    <span className="shrink-0 font-pixel text-[9px] text-primary">{money(net(s))}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 font-mono text-[10px] text-muted-foreground">
                Net of the platform fee. Payouts are sent to your wallet above.
              </p>
            </div>
          )}
        </div>

        {/* Purchased (your library) */}
        <div className="mb-12">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-pixel text-xs uppercase tracking-wider">Purchased</h2>
            <Link href="/explore" className="font-mono text-xs text-primary hover:underline">Browse →</Link>
          </div>
          {purchases.length === 0 ? (
            <div className="border-2 border-dashed border-border p-10 text-center">
              <p className="font-mono text-sm text-muted-foreground">Nothing purchased yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {purchases.map((p) => {
                const owner = purchaseOwnerMap.get(p.repo!.owner_id)
                const href = owner ? `/${owner}/${p.repo!.slug}` : `/listing/${p.repo!.id}`
                return (
                  <Link key={p.id} href={href} className="flex items-center justify-between gap-4 border-2 border-border bg-card px-5 py-4 transition-colors hover:border-primary">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm text-foreground">{p.repo!.title}</p>
                      {owner && <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">@{owner}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {p.escrow_status === 'held' && <span className="border-2 border-amber-400/50 px-2 py-1 font-pixel text-[8px] uppercase text-amber-400">in escrow</span>}
                      {p.escrow_status === 'released' && <span className="border-2 border-green-400/50 px-2 py-1 font-pixel text-[8px] uppercase text-green-400">released</span>}
                      {p.escrow_status === 'disputed' && <span className="border-2 border-amber-400/50 px-2 py-1 font-pixel text-[8px] uppercase text-amber-400">dispute</span>}
                      <span className="font-pixel text-[9px] text-green-400">${(p.amount_cents / 100).toFixed(0)}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-pixel text-xs uppercase tracking-wider">Repositories</h2>
          <Link href="/explore/new" className="font-mono text-xs text-primary hover:underline">+ Publish</Link>
        </div>

        {!repos || repos.length === 0 ? (
          <div className="border-2 border-dashed border-border p-10 text-center">
            <p className="font-mono text-sm text-muted-foreground">No repositories yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {repos.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-2 border-border bg-card px-5 py-4 gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-sm text-foreground truncate">{r.slug ?? r.title}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-pixel text-[9px] text-green-400">
                    {r.type === 'free' ? 'Free' : r.price_cents ? `$${(r.price_cents / 100).toFixed(0)}` : 'Paid'}
                  </span>
                  <span className={
                    'border-2 px-2 py-1 font-pixel text-[8px] uppercase ' +
                    (r.is_published ? 'border-primary text-primary' : 'border-border text-muted-foreground')
                  }>
                    {r.is_published ? 'live' : 'draft'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Jobs */}
        <div className="mt-12 flex items-center justify-between">
          <h2 className="font-pixel text-xs uppercase tracking-wider">Jobs</h2>
          <Link href="/hiring/new" className="font-mono text-xs text-primary hover:underline">+ Post a job</Link>
        </div>
        {!jobs || jobs.length === 0 ? (
          <div className="mt-4 border-2 border-dashed border-border p-10 text-center">
            <p className="font-mono text-sm text-muted-foreground">No jobs posted yet.</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {jobs.map((j) => (
              <Link key={j.id} href={`/hiring/${j.id}`} className="flex items-center justify-between gap-4 border-2 border-border bg-card px-5 py-4 transition-colors hover:border-primary">
                <p className="min-w-0 truncate font-mono text-sm text-foreground">{j.title}</p>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-pixel text-[9px] text-green-400">{jobBudget(j.budget_type, j.budget_value)}</span>
                  <span className={'border-2 px-2 py-1 font-pixel text-[8px] uppercase ' + statusBadge(j.status)}>
                    {j.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Orders */}
        <div className="mt-12 flex items-center justify-between">
          <h2 className="font-pixel text-xs uppercase tracking-wider">Orders</h2>
          <Link href="/orders/new" className="font-mono text-xs text-primary hover:underline">+ Create order</Link>
        </div>
        {!orders || orders.length === 0 ? (
          <div className="mt-4 border-2 border-dashed border-border p-10 text-center">
            <p className="font-mono text-sm text-muted-foreground">No orders posted yet.</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {orders.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between gap-4 border-2 border-border bg-card px-5 py-4 transition-colors hover:border-primary">
                <p className="min-w-0 truncate font-mono text-sm text-foreground">{o.title}</p>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-pixel text-[9px] text-green-400">${o.budget}</span>
                  <span className={'border-2 px-2 py-1 font-pixel text-[8px] uppercase ' + statusBadge(o.status)}>{o.status.replace('_', ' ')}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
