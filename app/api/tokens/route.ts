import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateToken, hashToken, tokenPrefix } from '@/lib/api-token'

// Create a personal API token for the CLI. The plaintext is returned ONCE here
// and never stored — only its SHA-256 hash is persisted.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let name = 'CLI token'
  try {
    const body = await req.json()
    name = String(body?.name ?? '').trim().slice(0, 60) || 'CLI token'
  } catch { /* default name */ }

  const token = generateToken()
  const admin = createAdminClient()
  const { error } = await admin.from('api_tokens').insert({
    user_id: user.id,
    name,
    token_hash: hashToken(token),
    token_prefix: tokenPrefix(token),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Shown once — the user must copy it now.
  return NextResponse.json({ token })
}
