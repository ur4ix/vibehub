import { createClient } from '@supabase/supabase-js'
import { renderOg, OG_SIZE, OG_CONTENT_TYPE, ogTrim } from '@/lib/og'

export const alt = 'Profile on Vydex'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params

  let title = `@${username}`
  let subtitle = 'on Vydex'

  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data } = await sb
      .from('profiles')
      .select('username, display_name, bio')
      .eq('username', username)
      .maybeSingle()
    const p = data as { username: string; display_name: string | null; bio: string | null } | null
    if (p) {
      title = ogTrim(p.display_name ?? `@${p.username}`, 56)
      subtitle = p.bio ? ogTrim(p.bio, 70) : `@${p.username}`
    }
  } catch {
    // fall back to @username
  }

  return renderOg({ eyebrow: 'profile', title, subtitle })
}
