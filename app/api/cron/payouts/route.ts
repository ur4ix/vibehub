import { NextRequest, NextResponse } from 'next/server'
import { runAutoPayouts } from '@/lib/payouts'

// Sends pending payouts automatically. Vercel Cron hits this and sends
// `Authorization: Bearer ${CRON_SECRET}`. No-ops unless PAYOUT_AUTO=1 and the
// static-IP proxy + TOTP secret are configured.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const result = await runAutoPayouts(req.nextUrl.origin)
  return NextResponse.json(result)
}
