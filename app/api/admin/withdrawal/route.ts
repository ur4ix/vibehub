import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWithdrawal } from '@/lib/withdrawals'

// Admin processing of a pending withdrawal.
//   send   → push it via NOWPayments Payout (auto 2FA), mark sent
//   manual → you sent the crypto yourself; just record it
//   reject → credit the amount back to the user's balance, mark failed
type Action = 'send' | 'manual' | 'reject'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let withdrawalId = ''
  let action: Action = 'send'
  let ref = ''
  try {
    const body = await req.json()
    withdrawalId = String(body?.withdrawalId ?? '')
    action = (['send', 'manual', 'reject'].includes(body?.action) ? body.action : 'send') as Action
    ref = String(body?.ref ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  if (!withdrawalId) return NextResponse.json({ error: 'Missing withdrawal' }, { status: 400 })

  const admin = createAdminClient()
  const { data: wRaw } = await admin
    .from('withdrawals')
    .select('id, user_id, amount_cents, address, currency, status, payout_ref')
    .eq('id', withdrawalId)
    .maybeSingle()
  const w = wRaw as { id: string; user_id: string; amount_cents: number; address: string; currency: string; status: string; payout_ref: string | null } | null
  if (!w) return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
  if (w.status !== 'pending') return NextResponse.json({ error: 'Already processed' }, { status: 409 })

  if (action === 'reject') {
    await admin.rpc('post_ledger', {
      p_user: w.user_id, p_amount: w.amount_cents, p_type: 'refund', p_ref: w.id, p_memo: 'Withdrawal rejected',
    })
    await admin.from('withdrawals').update({ status: 'failed' }).eq('id', w.id)
    return NextResponse.json({ ok: true, status: 'failed' })
  }

  if (action === 'manual') {
    await admin.from('withdrawals').update({ status: 'sent', payout_ref: ref || 'manual' }).eq('id', w.id)
    return NextResponse.json({ ok: true, status: 'sent' })
  }

  // action === 'send'
  try {
    const batch = await sendWithdrawal({
      address: w.address, currency: w.currency, amountUsd: w.amount_cents / 100, origin: req.nextUrl.origin,
      existingBatch: w.payout_ref,
      onBatch: async (id) => { await admin.from('withdrawals').update({ payout_ref: id }).eq('id', w.id) },
    })
    await admin.from('withdrawals').update({ status: 'sent', payout_ref: batch }).eq('id', w.id)
    return NextResponse.json({ ok: true, status: 'sent', ref: batch })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Send failed' }, { status: 502 })
  }
}
