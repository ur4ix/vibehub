import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'

const PLATFORM_FEE = 0.10 // 10% — recorded for accounting; payout is manual for crypto.

export async function POST(req: NextRequest) {
  let repositoryId: string
  try {
    const body = await req.json()
    repositoryId = String(body?.repositoryId ?? '')
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  if (!repositoryId) return NextResponse.json({ error: 'Missing repository' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: repoRaw } = await supabase
    .from('repositories')
    .select('id, owner_id, type, price_cents')
    .eq('id', repositoryId)
    .maybeSingle()
  const repo = repoRaw as { id: string; owner_id: string; type: string; price_cents: number | null } | null
  if (!repo) return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
  if (repo.type !== 'paid' || !repo.price_cents) return NextResponse.json({ error: 'Not a paid repository' }, { status: 400 })
  if (repo.owner_id === user.id) return NextResponse.json({ error: 'You own this repository' }, { status: 400 })

  // Already purchased?
  const { data: existing } = await supabase
    .from('purchases')
    .select('id, status')
    .eq('repository_id', repo.id)
    .eq('buyer_id', user.id)
    .maybeSingle()
  const ex = existing as { id: string; status: string } | null
  if (ex?.status === 'completed') return NextResponse.json({ alreadyOwned: true })

  const MERCHANT = process.env.CRYPTOMUS_MERCHANT_ID
  const KEY = process.env.CRYPTOMUS_API_KEY
  if (!MERCHANT || !KEY) {
    return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 503 })
  }

  // Reuse a pending purchase or create one.
  let purchaseId = ex?.id ?? null
  if (!purchaseId) {
    const { data: ins, error } = await supabase
      .from('purchases')
      .insert({
        repository_id: repo.id,
        buyer_id: user.id,
        seller_id: repo.owner_id,
        amount_cents: repo.price_cents,
        platform_fee_cents: Math.round(repo.price_cents * PLATFORM_FEE),
        status: 'pending',
        provider: 'cryptomus',
      })
      .select('id')
      .single()
    if (error || !ins) return NextResponse.json({ error: error?.message ?? 'Could not start checkout' }, { status: 500 })
    purchaseId = (ins as { id: string }).id
  }

  const origin = req.nextUrl.origin
  const payload = JSON.stringify({
    amount: (repo.price_cents / 100).toFixed(2),
    currency: 'USD',
    order_id: purchaseId,
    url_callback: `${origin}/api/webhooks/cryptomus`,
    url_return: `${origin}/listing/${repo.id}`,
    url_success: `${origin}/listing/${repo.id}`,
  })
  const sign = createHash('md5').update(Buffer.from(payload).toString('base64') + KEY).digest('hex')

  try {
    const res = await fetch('https://api.cryptomus.com/v1/payment', {
      method: 'POST',
      headers: { merchant: MERCHANT, sign, 'content-type': 'application/json' },
      body: payload,
    })
    const json = await res.json()
    const url = json?.result?.url
    if (!url) return NextResponse.json({ error: 'Could not create invoice' }, { status: 502 })
    return NextResponse.json({ url })
  } catch {
    return NextResponse.json({ error: 'Payment provider unavailable' }, { status: 502 })
  }
}
