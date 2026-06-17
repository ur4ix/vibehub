import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Server-side admin gate. Use in admin layouts/pages/route handlers.
 * Redirects unauthenticated users to /auth and non-admins to /dashboard.
 * Authorization is decided by Postgres (`is_admin()` over `user_roles`), never
 * trusted from the client.
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) redirect('/dashboard')

  return { supabase, user }
}
