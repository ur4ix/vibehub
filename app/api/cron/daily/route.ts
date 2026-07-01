import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAutoPayouts } from '@/lib/payouts'

// Single daily maintenance cron — Vercel's Hobby plan allows max 2 cron jobs,
// so the three tasks (release escrow, auto-release orders, auto payouts) run
// from one route. Each step is independent; a failure in one doesn't stop the
// others. Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const result: Record<string, unknown> = {}

  // 1) Release purchase escrow whose hold window passed (seller gets credited
  //    by the credit_seller_on_release trigger).
  try {
    const { data, error } = await admin
      .from('purchases')
      .update({ escrow_status: 'released' })
      .eq('status', 'completed')
      .eq('escrow_status', 'held')
      .lte('release_at', new Date().toISOString())
      .select('id, seller_id')
    if (error) throw new Error(error.message)
    const rows = (data as { id: string; seller_id: string }[] | null) ?? []
    if (rows.length > 0) {
      await admin.from('notifications').insert(rows.map((r) => ({
        user_id: r.seller_id,
        type: 'payout',
        title: 'Escrow released',
        body: 'A sale cleared escrow — the earnings are on your balance.',
      })))
    }
    result.escrowReleased = rows.length
  } catch (e) {
    result.escrowError = e instanceof Error ? e.message : 'failed'
  }

  // 2) Auto-accept order deliveries past their review deadline.
  try {
    const { data, error } = await admin.rpc('auto_release_due_orders')
    if (error) throw new Error(error.message)
    result.ordersReleased = (data as number) ?? 0
  } catch (e) {
    result.ordersError = e instanceof Error ? e.message : 'failed'
  }

  // 3) Auto payouts (no-ops unless PAYOUT_AUTO=1 with proxy + TOTP configured).
  try {
    result.payouts = await runAutoPayouts(req.nextUrl.origin)
  } catch (e) {
    result.payoutsError = e instanceof Error ? e.message : 'failed'
  }

  return NextResponse.json(result)
}
