import { createHash, randomBytes } from 'crypto'

// Personal API tokens for the `vydex` CLI. SERVER ONLY.
// Format: vdx_<48 hex>. We store only the SHA-256 hash; the prefix is kept for
// display so users can tell their tokens apart.

export function generateToken(): string {
  return 'vdx_' + randomBytes(24).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function tokenPrefix(token: string): string {
  return token.slice(0, 12)
}
