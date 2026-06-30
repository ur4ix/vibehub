import { test } from 'node:test'
import assert from 'node:assert/strict'

import { totp } from '../lib/totp.ts'
import { generateToken, hashToken, tokenPrefix } from '../lib/api-token.ts'
import { deliveryLabel, orderCode, BUDGET_RANGES, TIMELINES } from '../lib/orders.ts'

// ─── TOTP (RFC 6238 test vector) ────────────────────────────────────────────
test('totp matches the RFC 6238 SHA-1 vector', () => {
  // secret "12345678901234567890" → base32; at T=59s the RFC code is 94287082,
  // truncated to 6 digits = 287082.
  const base32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
  assert.equal(totp(base32, 59_000), '287082')
})

test('totp is stable within a 30s step and changes across steps', () => {
  assert.equal(totp('GEZDGNBVGY3TQOJQ', 0), totp('GEZDGNBVGY3TQOJQ', 29_000))
  assert.notEqual(totp('GEZDGNBVGY3TQOJQ', 0), totp('GEZDGNBVGY3TQOJQ', 31_000))
})

// ─── API tokens ─────────────────────────────────────────────────────────────
test('generateToken has the vdx_ prefix and 48 hex chars', () => {
  const t = generateToken()
  assert.match(t, /^vdx_[0-9a-f]{48}$/)
})

test('hashToken is deterministic and 64 hex chars (sha256)', () => {
  assert.equal(hashToken('vdx_abc'), hashToken('vdx_abc'))
  assert.match(hashToken('vdx_abc'), /^[0-9a-f]{64}$/)
  assert.notEqual(hashToken('a'), hashToken('b'))
})

test('tokenPrefix returns the first 12 chars', () => {
  const t = generateToken()
  assert.equal(tokenPrefix(t), t.slice(0, 12))
  assert.equal(tokenPrefix(t).length, 12)
})

// ─── Orders helpers ─────────────────────────────────────────────────────────
test('deliveryLabel buckets days correctly', () => {
  assert.equal(deliveryLabel(null), 'Flexible')
  assert.equal(deliveryLabel(undefined), 'Flexible')
  assert.equal(deliveryLabel(1), '1–3 days')
  assert.equal(deliveryLabel(3), '1–3 days')
  assert.equal(deliveryLabel(7), 'Up to a week')
  assert.equal(deliveryLabel(30), 'Up to a month')
  assert.equal(deliveryLabel(45), '45 days')
})

test('orderCode is stable and well-formed', () => {
  const id = '550e8400-e29b-41d4-a716-446655440000'
  assert.match(orderCode(id), /^ORD-\d{4}$/)
  assert.equal(orderCode(id), orderCode(id))
})

test('budget ranges and timelines map to expected primitives', () => {
  assert.deepEqual(BUDGET_RANGES.map((b) => b.min), [50, 200, 500, 1000, 3000])
  assert.deepEqual(TIMELINES.map((t) => t.days), [3, 7, 30, null])
})
