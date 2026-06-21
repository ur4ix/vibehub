import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PLATFORM_FEE = 0.10 // 10% — recorded for accounting; crypto payout is manual.

// Crypto checkout via NOWPayments (non-custodial; funds settle to your wallet).
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
    .select('id, title, owner_id, type, price_cents')
    .eq('id', repositoryId)
    .maybeSingle()
  const repo = repoRaw as { id: string; title: string; owner_id: string; type: string; price_cents: number | null } | null
  if (!repo) return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
  if (repo.type !== 'paid' || !repo.price_cents) return NextResponse.json({ error: 'Not a paid repository' }, { status: 400 })
  if (repo.owner_id === user.id) return NextResponse.json({ error: 'You own this repository' }, { status: 400 })

  const { data: existing } = await supabase
    .from('purchases')
    .select('id, status')
    .eq('repository_id', repo.id)
    .eq('buyer_id', user.id)
    .maybeSingle()
  const ex = existing as { id: string; status: string } | null
  if (ex?.status === 'completed') return NextResponse.json({ alreadyOwned: true })

  const API_KEY = process.env.NOWPAYMENTS_API_KEY
  if (!API_KEY) return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 503 })

  // Reuse a pending purchase or create one.
  let purchaseId = ex?.id ?? null
  if (!purchaseId) {
    // First-month-free: a seller pays 0% platform fee for their first 30 days
    // (matches the "0% your first month" promise across the site).
    const { data: sellerRaw } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('id', repo.owner_id)
      .maybeSingle()
    const sellerCreatedAt = (sellerRaw as { created_at: string } | null)?.created_at
    const inFirstMonth = sellerCreatedAt
      ? Date.now() - new Date(sellerCreatedAt).getTime() < 30 * 86_400_000
      : false
    const feeCents = inFirstMonth ? 0 : Math.round(repo.price_cents * PLATFORM_FEE)

    const { data: ins, error } = await supabase
      .from('purchases')
      .insert({
        repository_id: repo.id,
        buyer_id: user.id,
        seller_id: repo.owner_id,
        amount_cents: repo.price_cents,
        platform_fee_cents: feeCents,
        status: 'pending',
        provider: 'nowpayments',
      })
      .select('id')
      .single()
    if (error || !ins) return NextResponse.json({ error: error?.message ?? 'Could not start checkout' }, { status: 500 })
    purchaseId = (ins as { id: string }).id
  }

  const origin = req.nextUrl.origin
  try {
    const res = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        price_amount: repo.price_cents / 100,
        price_currency: 'usd',
        order_id: purchaseId,
        order_description: `VYDEX — ${repo.title}`.slice(0, 200),
        ipn_callback_url: `${origin}/api/webhooks/nowpayments`,
        success_url: `${origin}/listing/${repo.id}`,
        cancel_url: `${origin}/listing/${repo.id}`,
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
