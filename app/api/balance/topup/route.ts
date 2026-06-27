import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Fund the internal balance with crypto via a NOWPayments invoice. The balance
// is credited when the IPN arrives (see the webhook's `topup_` branch).
export async function POST(req: NextRequest) {
  let amountUsd = 0
  try {
    const body = await req.json()
    amountUsd = Number(body?.amountUsd ?? 0)
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  if (!Number.isFinite(amountUsd) || amountUsd < 5 || amountUsd > 10000) {
    return NextResponse.json({ error: 'Enter an amount between $5 and $10,000' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const API_KEY = process.env.NOWPAYMENTS_API_KEY
  if (!API_KEY) return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 503 })

  const amountCents = Math.round(amountUsd * 100)
  const admin = createAdminClient()
  const { data: ins, error } = await admin
    .from('topups')
    .insert({ user_id: user.id, amount_cents: amountCents })
    .select('id')
    .single()
  if (error || !ins) return NextResponse.json({ error: error?.message ?? 'Could not start top-up' }, { status: 500 })
  const topupId = (ins as { id: string }).id

  const origin = req.nextUrl.origin
  try {
    const res = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        price_amount: amountCents / 100,
        price_currency: 'usd',
        order_id: `topup_${topupId}`,
        order_description: `VYDEX — balance top-up`,
        ipn_callback_url: `${origin}/api/webhooks/nowpayments`,
        success_url: `${origin}/dashboard`,
        cancel_url: `${origin}/dashboard`,
      }),
    })
    const json = await res.json()
    const url = json?.invoice_url
    if (!url) return NextResponse.json({ error: 'Could not create invoice' }, { status: 502 })
    return NextResponse.json({ url })
  } catch {
    return NextResponse.json({ error: 'Payment provider unavailable' }, { status: 502 })
  }
}
