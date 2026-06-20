import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Auto-release escrow whose hold window has passed. Vercel Cron hits this on a
// schedule and sends `Authorization: Bearer ${CRON_SECRET}` automatically.
// Releasing only moves the seller payout from "held" to "ready to pay out"; the
// buyer already has access. Disputed/refunded rows are untouched.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('purchases')
    .update({ escrow_status: 'released' })
    .eq('status', 'completed')
    .eq('escrow_status', 'held')
    .lte('release_at', new Date().toISOString())
    .select('id, seller_id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data as { id: string; seller_id: string }[] | null) ?? []

  // Best-effort: tell each seller their funds are ready to pay out.
  if (rows.length > 0) {
    const notifs = rows.map((r) => ({
      user_id: r.seller_id,
      type: 'payout',
      title: 'Escrow released',
      body: 'A sale cleared escrow and is ready to pay out.',
    }))
    await admin.from('notifications').insert(notifs)
  }

  return NextResponse.json({ released: rows.length })
}
