import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// Recursively sort object keys — NOWPayments signs the key-sorted JSON.
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = sortKeys((value as Record<string, unknown>)[k])
      return acc
    }, {})
  }
  return value
}

// NOWPayments IPN: verify x-nowpayments-sig, then mark the purchase completed.
export async function POST(req: NextRequest) {
  const IPN = process.env.NOWPAYMENTS_IPN_SECRET
  if (!IPN) return NextResponse.json({ error: 'not configured' }, { status: 503 })

  const raw = await req.text()
  const sig = req.headers.get('x-nowpayments-sig')
  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'bad body' }, { status: 400 })
  }

  const expected = createHmac('sha512', IPN).update(JSON.stringify(sortKeys(body))).digest('hex')
  const sigBuf = Buffer.from(sig ?? '', 'hex')
  const expBuf = Buffer.from(expected, 'hex')
  if (!sig || sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 403 })
  }

  const status = body.payment_status as string | undefined
  const orderId = body.order_id as string | undefined
  const done = status === 'finished' || status === 'confirmed'

  if (done && orderId) {
    const admin = createAdminClient()

    // Defense in depth: the IPN is signed, but still confirm the (signed)
    // invoice amount/currency matches what this purchase should cost before
    // unlocking the download. Refuse to complete on an underpayment.
    const { data: pRaw } = await admin
      .from('purchases')
      .select('amount_cents, status')
      .eq('id', orderId)
      .maybeSingle()
    const purchase = pRaw as { amount_cents: number; status: string } | null
    if (!purchase || purchase.status !== 'pending') {
      return NextResponse.json({ ok: true }) // unknown or already settled
    }

    const paidUsd = Number(body.price_amount)
    const currency = String(body.price_currency ?? '').toLowerCase()
    const expectedUsd = purchase.amount_cents / 100
    if (
      currency !== 'usd' ||
      !Number.isFinite(paidUsd) ||
      paidUsd + 0.01 < expectedUsd // allow a 1-cent rounding tolerance
    ) {
      return NextResponse.json({ ok: true, ignored: 'amount_mismatch' })
    }

    const ESCROW_DAYS = 3
    const releaseAt = new Date(Date.now() + ESCROW_DAYS * 86400_000).toISOString()
    await admin
      .from('purchases')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        provider_ref: String(body.payment_id ?? body.invoice_id ?? ''),
        escrow_status: 'held',
        release_at: releaseAt,
      })
      .eq('id', orderId)
      .eq('status', 'pending')
  }

  return NextResponse.json({ ok: true })
}
