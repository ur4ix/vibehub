import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Auto-accept order deliveries the owner left past their review deadline, so
// funds never get stuck. Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('auto_release_due_orders')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ released: (data as number) ?? 0 })
}
