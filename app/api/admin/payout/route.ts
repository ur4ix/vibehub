import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { payoutAuth, createPayout, verifyPayout, isStableCurrency } from '@/lib/nowpayments-payout'

// Pay a released escrow out to the seller. Admin only.
//   mode 'manual'      → you sent the crypto yourself; just record it.
//   mode 'nowpayments' → send via the NOWPayments Payout API (needs a 2FA code).
export async function POST(req: NextRequest) {
  // Authorize: must be an admin (decided by Postgres, not the client).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let purchaseId = ''
  let mode: 'manual' | 'nowpayments' = 'manual'
  let ref = ''
  let code = ''
  try {
    const body = await req.json()
    purchaseId = String(body?.purchaseId ?? '')
    mode = body?.mode === 'nowpayments' ? 'nowpayments' : 'manual'
    ref = String(body?.ref ?? '').trim()
    code = String(body?.code ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  if (!purchaseId) return NextResponse.json({ error: 'Missing purchase' }, { status: 400 })

  const admin = createAdminClient()
  const { data: pRaw } = await admin
    .from('purchases')
    .select('id, seller_id, amount_cents, platform_fee_cents, status, escrow_status, payout_status')
    .eq('id', purchaseId)
    .maybeSingle()
  const p = pRaw as {
    id: string; seller_id: string; amount_cents: number; platform_fee_cents: number
    status: string; escrow_status: string | null; payout_status: string | null
  } | null
  if (!p) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })

  // Only pay out released, unpaid, paid sales.
  if (p.status !== 'completed' || p.escrow_status !== 'released' || p.amount_cents <= 0) {
    return NextResponse.json({ error: 'Not eligible for payout' }, { status: 400 })
  }
  if (p.payout_status === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 409 })

  const netCents = p.amount_cents - p.platform_fee_cents
  let payoutRef = ref || 'manual'

  if (mode === 'nowpayments') {
    if (!code) return NextResponse.json({ error: '2FA code required' }, { status: 400 })

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
      await verifyPayout(token, batch.id, code)
      payoutRef = batch.id
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Payout failed' }, { status: 502 })
    }
  }

  const { error: updErr } = await admin
    .from('purchases')
    .update({ payout_status: 'paid', payout_ref: payoutRef, paid_at: new Date().toISOString() })
    .eq('id', p.id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // Notify the seller they were paid.
  await admin.from('notifications').insert({
    user_id: p.seller_id,
    type: 'payout',
    title: 'You got paid',
    body: `Payout sent: $${(netCents / 100).toFixed(2)}.`,
  })

  return NextResponse.json({ ok: true, ref: payoutRef })
}
