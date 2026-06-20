import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// Cryptomus payment webhook. Verifies the signature, then marks the matching
// pending purchase completed (service role → bypasses RLS). Idempotent.
export async function POST(req: NextRequest) {
  const KEY = process.env.CRYPTOMUS_API_KEY
  if (!KEY) return NextResponse.json({ error: 'not configured' }, { status: 503 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad body' }, { status: 400 })
  }

  // Signature: md5( base64( json_without_sign ) + apiKey )
  const sign = body.sign as string | undefined
  const data = { ...body }
  delete data.sign
  const expected = createHash('md5').update(Buffer.from(JSON.stringify(data)).toString('base64') + KEY).digest('hex')
  if (!sign || sign !== expected) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 403 })
  }

  const orderId = body.order_id as string | undefined
  const status = body.status as string | undefined
  const paid = status === 'paid' || status === 'paid_over'

  if (paid && orderId) {
    const admin = createAdminClient()
    await admin
      .from('purchases')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        provider_ref: (body.uuid as string) ?? null,
      })
      .eq('id', orderId)
      .eq('status', 'pending')
  }

  return NextResponse.json({ ok: true })
}
