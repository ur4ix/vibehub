import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Resolve a disputed escrow. Staff (admin or moderator) only.
//   release → side with the seller: escrow released, seller gets paid.
//   refund  → side with the buyer: escrow refunded, seller not paid (you return
//             the crypto to the buyer manually).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { data: isStaff } = await supabase.rpc('is_staff')
  if (!isStaff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let purchaseId = ''
  let action: 'release' | 'refund' = 'release'
  try {
    const body = await req.json()
    purchaseId = String(body?.purchaseId ?? '')
    action = body?.action === 'refund' ? 'refund' : 'release'
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  if (!purchaseId) return NextResponse.json({ error: 'Missing purchase' }, { status: 400 })

  const admin = createAdminClient()
  const { data: pRaw } = await admin
    .from('purchases')
    .select('id, buyer_id, seller_id, amount_cents, escrow_status')
    .eq('id', purchaseId)
    .maybeSingle()
  const p = pRaw as { id: string; buyer_id: string; seller_id: string; amount_cents: number; escrow_status: string | null } | null
  if (!p) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
  if (p.escrow_status !== 'disputed') return NextResponse.json({ error: 'Not a disputed purchase' }, { status: 400 })

  const next = action === 'refund' ? 'refunded' : 'released'
  const { error } = await admin.from('purchases').update({ escrow_status: next }).eq('id', p.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const amount = `$${(p.amount_cents / 100).toFixed(2)}`
  if (action === 'refund') {
    await admin.from('notifications').insert([
      { user_id: p.buyer_id, type: 'dispute', title: 'Dispute resolved', body: `Your dispute was approved — a refund of ${amount} is being processed.` },
      { user_id: p.seller_id, type: 'dispute', title: 'Dispute refunded', body: `A dispute on a ${amount} sale was resolved in the buyer's favor.` },
    ])
  } else {
    await admin.from('notifications').insert([
      { user_id: p.seller_id, type: 'dispute', title: 'Dispute resolved', body: `A dispute on a ${amount} sale was resolved in your favor — it's released for payout.` },
      { user_id: p.buyer_id, type: 'dispute', title: 'Dispute closed', body: `Your dispute was reviewed and the ${amount} payment was released to the seller.` },
    ])
  }

  return NextResponse.json({ ok: true, status: next })
}
