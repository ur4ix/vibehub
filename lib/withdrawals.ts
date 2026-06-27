import { payoutAuth, createPayout, verifyPayout } from '@/lib/nowpayments-payout'
import { totp } from '@/lib/totp'

// Send a balance withdrawal to the user's wallet via the NOWPayments Payout API
// (auth → create batch → 2FA verify). Throws 'manual' when auto-payout isn't
// configured so the caller can leave the withdrawal pending for admin handling.
// Returns the batch id on success.
export async function sendWithdrawal(
  address: string,
  currency: string,
  amountUsd: number,
  origin: string,
): Promise<string> {
  const secret = process.env.NOWPAYMENTS_TOTP_SECRET
  if (process.env.PAYOUT_AUTO !== '1' || !secret || !process.env.PAYOUT_PROXY_URL) {
    throw new Error('manual')
  }
  const token = await payoutAuth()
  const batch = await createPayout(
    token,
    [{ address, currency, amount: amountUsd }],
    `${origin}/api/webhooks/nowpayments`,
  )
  await verifyPayout(token, batch.id, totp(secret))
  return batch.id
}
