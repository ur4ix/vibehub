import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWithdrawal } from '@/lib/withdrawals'

// Cash out internal balance to crypto. request_withdrawal() debits the balance
// and creates a pending withdrawal atomically; we then try to send it right away
// via NOWPayments Payout. If auto-payout isn't configured (or fails), it stays
// pending for an admin to process.
export async function POST(req: NextRequest) {
  let amountUsd = 0
  try {
    const body = await req.json()
    amountUsd = Number(body?.amountUsd ?? 0)
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  if (!Number.isFinite(amountUsd) || amountUsd < 5) {
    return NextResponse.json({ error: 'Minimum withdrawal is $5.00' }, { status: 400 })
  }
  const amountCents = Math.round(amountUsd * 100)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Debit + create the pending withdrawal as the user (RLS / balance check).
  const { data: wid, error } = await supabase.rpc('request_withdrawal', { p_amount_cents: amountCents })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const withdrawalId = wid as string

  // Best-effort immediate send.
  const admin = createAdminClient()
  const { data: wRaw } = await admin
    .from('withdrawals')
    .select('address, currency')
    .eq('id', withdrawalId)
    .single()
  const w = wRaw as { address: string; currency: string } | null
  if (w) {
    try {
      const ref = await sendWithdrawal(w.address, w.currency, amountCents / 100, req.nextUrl.origin)
      await admin.from('withdrawals').update({ status: 'sent', payout_ref: ref }).eq('id', withdrawalId)
      return NextResponse.json({ ok: true, status: 'sent' })
    } catch {
      // left pending for admin processing
    }
  }
  return NextResponse.json({ ok: true, status: 'pending' })
}
