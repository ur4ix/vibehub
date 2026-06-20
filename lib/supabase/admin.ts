import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Service-role client — SERVER ONLY (never import in client components).
// Bypasses RLS; used by payment webhooks to mark purchases completed.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
