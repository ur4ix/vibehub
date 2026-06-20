import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { payoutAuth, createPayout, verifyPayout, isStableCurrency } from '@/lib/nowpayments-payout'

// Pay a released escrow out to the seller. Admin only.
//
//   mode 'manual'      → you sent the crypto yourself; record it (one step).
//   mode 'nowpayments' → two steps, because NOWPayments emails the 2FA code
//                        only AFTER the batch is created:
//                          action 'create' → make the batch (code is emailed),
//                                            we store batch id + status 'pending'
//                          action 'verify' → submit the emailed code → sent + paid
type SaleRow = {
  id: string; seller_id: string; amount_cents: number; platform_fee_cents: number
  status: string; escrow_status: string | null; payout_status: string | null; payout_ref: string | null
}

export async function POST(req: NextRequest) {
  // Authorize: must be an admin (decided by Postgres, not the client).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let purchaseId = ''
  let mode: 'manual' | 'nowpayments' = 'manual'
  let action: 'create' | 'verify' = 'create'
  let ref = ''
  let code = ''
  try {
    const body = await req.json()
    purchaseId = String(body?.purchaseId ?? '')
    mode = body?.mode === 'nowpayments' ? 'nowpayments' : 'manual'
    action = body?.action === 'verify' ? 'verify' : 'create'
    ref = String(body?.ref ?? '').trim()
    code = String(body?.code ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  if (!purchaseId) return NextResponse.json({ error: 'Missing purchase' }, { status: 400 })

  const admin = createAdminClient()
  const { data: pRaw } = await admin
    .from('purchases')
    .select('id, seller_id, amount_cents, platform_fee_cents, status, escrow_status, payout_status, payout_ref')
    .eq('id', purchaseId)
    .maybeSingle()
  const p = pRaw as SaleRow | null
  if (!p) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })

  // Only pay out released, paid sales that aren't already paid.
  if (p.status !== 'completed' || p.escrow_status !== 'released' || p.amount_cents <= 0) {
    return NextResponse.json({ error: 'Not eligible for payout' }, { status: 400 })
  }
  if (p.payout_status === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 409 })

  const netCents = p.amount_cents - p.platform_fee_cents

  // ── Manual: just record it ────────────────────────────────────────────────
  if (mode === 'manual') {
    return finalizePaid(admin, p, ref || 'manual', netCents)
  }

  // ── NOWPayments, step 1: create the batch (triggers the 2FA email) ────────
  if (action === 'create') {
    // Resume an existing unverified batch instead of creating a duplicate.
    if (p.payout_status === 'pending' && p.payout_ref) {
      return NextResponse.json({ stage: 'created', batchId: p.payout_ref, resumed: true })
    }

    const { data: sRaw } = await admin
      .from('users')
      .select('payout_address, payout_currency')
      .eq('id', p.seller_id)
      .maybeSingle()
    const seller = sRaw as { payout_address: string | null; payout_currency: string | null } | null
    if (!seller?.payout_address || !seller.payout_currency) {
      return NextResponse.json({ error: 'Seller has no payout wallet set' }, { status: 400 })
    }
    if (!isStableCurrency(seller.payout_currency)) {
      return NextResponse.json({ error: 'Auto-payout supports stablecoins only — pay this one manually' }, { status: 400 })
    }

    try {
      const token = await payoutAuth()
      const batch = await createPayout(
        token,
        [{ address: seller.payout_address, currency: seller.payout_currency, amount: netCents / 100 }],
        `${req.nextUrl.origin}/api/webhooks/nowpayments`,
      )
      // Remember the batch so the verify step can find it (still unpaid).
      await admin
        .from('purchases')
        .update({ payout_status: 'pending', payout_ref: batch.id })
        .eq('id', p.id)
      return NextResponse.json({ stage: 'created', batchId: batch.id })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Payout failed' }, { status: 502 })
    }
  }

  // ── NOWPayments, step 2: verify the emailed code → it sends ───────────────
  if (!code) return NextResponse.json({ error: '2FA code required' }, { status: 400 })
  if (!p.payout_ref) return NextResponse.json({ error: 'No payout batch to verify — create it first' }, { status: 400 })
  try {
    const token = await payoutAuth()
    await verifyPayout(token, p.payout_ref, code)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Verification failed' }, { status: 502 })
  }
  return finalizePaid(admin, p, p.payout_ref, netCents)
}

// Mark paid + notify the seller.
async function finalizePaid(
  admin: ReturnType<typeof createAdminClient>,
  p: SaleRow,
  payoutRef: string,
  netCents: number,
) {
  const { error } = await admin
    .from('purchases')
    .update({ payout_status: 'paid', payout_ref: payoutRef, paid_at: new Date().toISOString() })
    .eq('id', p.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('notifications').insert({
    user_id: p.seller_id,
    type: 'payout',
    title: 'You got paid',
    body: `Payout sent: $${(netCents / 100).toFixed(2)}.`,
  })
  return NextResponse.json({ ok: true, ref: payoutRef })
}
