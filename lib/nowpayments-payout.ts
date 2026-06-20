// NOWPayments Mass Payout API client. SERVER ONLY.
//
// The payout API is separate from the invoice API and needs more auth:
//   1) JWT from /v1/auth (account email + password)
//   2) the x-api-key header
//   3) a 2FA (TOTP) code to *verify* each payout batch before it sends
//
// So a payout is: auth → create batch → verify with 2FA code. We can't skip the
// 2FA step — NOWPayments enforces it — so the admin enters the code at payout
// time. Amounts are in the destination crypto; for stablecoins we treat
// 1 token ≈ 1 USD (good enough for USDT/USDC). Non-stable currencies should be
// paid manually since they need a live FX rate.

import { ProxyAgent } from 'undici'

const BASE = 'https://api.nowpayments.io/v1'

export function isStableCurrency(currency: string): boolean {
  const c = currency.toLowerCase()
  return ['usdt', 'usdc', 'dai', 'busd'].some((p) => c.startsWith(p))
}

// NOWPayments requires the Payout API caller's IP to be whitelisted. Vercel's
// egress IPs are dynamic, so we route payout calls through a static-IP proxy
// (PAYOUT_PROXY_URL, e.g. QuotaGuard/Fixie) and whitelist that one IP.
let cachedAgent: { url: string; agent: ProxyAgent } | null = null
function dispatcher(): ProxyAgent | undefined {
  const url = process.env.PAYOUT_PROXY_URL
  if (!url) return undefined
  if (cachedAgent?.url !== url) cachedAgent = { url, agent: new ProxyAgent(url) }
  return cachedAgent.agent
}

// fetch that egresses through the static-IP proxy when configured.
function pfetch(url: string, init: RequestInit): Promise<Response> {
  const agent = dispatcher()
  const opts = { ...init } as RequestInit & { dispatcher?: ProxyAgent }
  if (agent) opts.dispatcher = agent
  return fetch(url, opts as RequestInit)
}

export interface Withdrawal {
  address: string
  currency: string
  amount: number
}

// Step 1 — exchange account credentials for a short-lived bearer token.
export async function payoutAuth(): Promise<string> {
  const email = process.env.NOWPAYMENTS_EMAIL
  const password = process.env.NOWPAYMENTS_PASSWORD
  if (!email || !password) throw new Error('NOWPayments payout credentials are not configured')

  const res = await pfetch(`${BASE}/auth`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json?.token) throw new Error(json?.message || `NOWPayments auth failed (${res.status})`)
  return json.token as string
}

// Step 2 — create the payout batch (returns a batch id; status is "waiting" until verified).
export async function createPayout(
  token: string,
  withdrawals: Withdrawal[],
  ipnCallbackUrl?: string,
): Promise<{ id: string }> {
  const key = process.env.NOWPAYMENTS_API_KEY
  if (!key) throw new Error('NOWPAYMENTS_API_KEY is not configured')

  const res = await pfetch(`${BASE}/payout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'x-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ ipn_callback_url: ipnCallbackUrl, withdrawals }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json?.id) throw new Error(json?.message || `NOWPayments payout failed (${res.status})`)
  return { id: String(json.id) }
}

// Step 3 — verify the batch with a 2FA code so it actually sends.
export async function verifyPayout(token: string, batchId: string, code: string): Promise<void> {
  const key = process.env.NOWPAYMENTS_API_KEY
  if (!key) throw new Error('NOWPAYMENTS_API_KEY is not configured')

  const res = await pfetch(`${BASE}/payout/${batchId}/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'x-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ verification_code: code }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json?.message || `NOWPayments verify failed (${res.status})`)
  }
}
