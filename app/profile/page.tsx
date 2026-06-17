import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// /profile is now just the owner's view of their public profile.
// Redirect to /u/<username> (or /auth when signed out).
export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()

  const username = (profile as { username: string } | null)?.username
  redirect(username ? `/u/${username}` : '/dashboard')
}
