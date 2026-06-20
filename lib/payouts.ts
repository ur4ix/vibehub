import { createAdminClient } from '@/lib/supabase/admin'
import { payoutAuth, createPayout, verifyPayout, isStableCurrency } from '@/lib/nowpayments-payout'
import { totp } from '@/lib/totp'

// Automated payout engine, shared by the cron and the admin "run now" button.
// Pays each released, unpaid, stablecoin sale via the NOWPayments Payout API
// (create batch → auto-generate the 2FA code → verify), then marks it paid.
//
// Safety:
//   • PAYOUT_AUTO must be '1' (kill switch).
//   • Needs PAYOUT_PROXY_URL (static IP) + NOWPAYMENTS_TOTP_SECRET.
//   • Per-payout cap (PAYOUT_MAX_USD) — bigger ones are left for manual review.
//   • Idempotent claim (null → 'pending') so two runs can't double-pay; a
//     half-finished batch ('pending' with a ref) is resumed, not recreated.

type Admin = ReturnType<typeof createAdminClient>

interface Row {
  id: string
  seller_id: string
  amount_cents: number
  platform_fee_cents: number
  payout_status: string | null
  payout_ref: string | null
}

export interface PayoutRunResult {
  paid: number
  skipped: number
  errors: { id: string; error: string }[]
  reason?: string
}

export async function runAutoPayouts(origin: string): Promise<PayoutRunResult> {
  const empty = (reason: string): PayoutRunResult => ({ paid: 0, skipped: 0, errors: [], reason })

  if (process.env.PAYOUT_AUTO !== '1') return empty('disabled')
  const secret = process.env.NOWPAYMENTS_TOTP_SECRET
  if (!secret) return empty('no TOTP secret')
  if (!process.env.PAYOUT_PROXY_URL) return empty('no static-IP proxy')

  const capUsd = Number(process.env.PAYOUT_MAX_USD ?? '1000')
  const admin = createAdminClient()

  // Released, unpaid sales (null = new, pending = resume a started batch).
  const { data: raw } = await admin
    .from('purchases')
    .select('id, seller_id, amount_cents, platform_fee_cents, payout_status, payout_ref')
    .eq('status', 'completed')
    .eq('escrow_status', 'released')
    .gt('amount_cents', 0)
    .or('payout_status.is.null,payout_status.eq.pending')
  const rows = (raw as Row[] | null) ?? []

  const result: PayoutRunResult = { paid: 0, skipped: 0, errors: [] }

  for (const row of rows) {
    try {
      const done = await processOne(admin, row, secret, origin, capUsd)
      if (done) result.paid++
      else result.skipped++
    } catch (e) {
      result.errors.push({ id: row.id, error: e instanceof Error ? e.message : 'failed' })
    }
  }
  return result
}

async function processOne(admin: Admin, row: Row, secret: string, origin: string, capUsd: number): Promise<boolean> {
  const netCents = row.amount_cents - row.platform_fee_cents
  if (netCents / 100 > capUsd) return false // too big for auto — handle manually

  // Seller wallet must exist and be a stablecoin (we pay net USD 1:1).
  const { data: sRaw } = await admin
    .from('users')
    .select('payout_address, payout_currency')
    .eq('id', row.seller_id)
    .maybeSingle()
  const seller = sRaw as { payout_address: string | null; payout_currency: string | null } | null
  if (!seller?.payout_address || !seller.payout_currency || !isStableCurrency(seller.payout_currency)) {
    return false
  }

  let batchId = row.payout_ref

  // New row: claim it atomically (null → pending) so a concurrent run can't
  // also pay it. If the claim updates nothing, someone else took it.
  if (row.payout_status !== 'pending') {
    const { data: claimed } = await admin
      .from('purchases')
      .update({ payout_status: 'pending' })
      .eq('id', row.id)
      .is('payout_status', null)
      .select('id')
    if (!claimed || (claimed as unknown[]).length === 0) return false
    batchId = null
  }

  const token = await payoutAuth()

  // Create the batch if we don't already have one for this row.
  if (!batchId) {
    const batch = await createPayout(
      token,
      [{ address: seller.payout_address, currency: seller.payout_currency, amount: netCents / 100 }],
      `${origin}/api/webhooks/nowpayments`,
    )
    batchId = batch.id
    await admin.from('purchases').update({ payout_ref: batchId }).eq('id', row.id)
  }

  // Generate the current 2FA code and verify → the batch sends.
  await verifyPayout(token, batchId, totp(secret))

  await admin
    .from('purchases')
    .update({ payout_status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', row.id)

  await admin.from('notifications').insert({
    user_id: row.seller_id,
    type: 'payout',
    title: 'You got paid',
    body: `Payout sent: $${(netCents / 100).toFixed(2)}.`,
  })
  return true
}
