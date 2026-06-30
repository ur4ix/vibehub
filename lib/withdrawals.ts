import { payoutAuth, createPayout, verifyPayout } from '@/lib/nowpayments-payout'
import { totp } from '@/lib/totp'

interface SendOpts {
  address: string
  currency: string
  amountUsd: number
  origin: string
  // Resume a batch that was already created (don't create a second one).
  existingBatch?: string | null
  // Called with the new batch id BEFORE 2FA verify, so the caller can persist it
  // — that way a crash after "send" but before the DB update can't double-pay.
  onBatch?: (batchId: string) => Promise<void>
}

// Send a balance withdrawal to the user's wallet via the NOWPayments Payout API
// (auth → create batch → 2FA verify). Throws 'manual' when auto-payout isn't
// configured so the caller can leave the withdrawal pending for admin handling.
export async function sendWithdrawal(opts: SendOpts): Promise<string> {
  const secret = process.env.NOWPAYMENTS_TOTP_SECRET
  if (process.env.PAYOUT_AUTO !== '1' || !secret || !process.env.PAYOUT_PROXY_URL) {
    throw new Error('manual')
  }
  const token = await payoutAuth()

  let batchId = opts.existingBatch ?? ''
  if (!batchId) {
    const batch = await createPayout(
      token,
      [{ address: opts.address, currency: opts.currency, amount: opts.amountUsd }],
      `${opts.origin}/api/webhooks/nowpayments`,
    )
    batchId = batch.id
    if (opts.onBatch) await opts.onBatch(batchId) // persist before verify
  }

  await verifyPayout(token, batchId, totp(secret))
  return batchId
}
