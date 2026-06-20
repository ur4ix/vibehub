import { createClient } from '@supabase/supabase-js'
import { renderOg, OG_SIZE, OG_CONTENT_TYPE, ogTrim } from '@/lib/og'

export const alt = 'Repository on Vydex'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image({ params }: { params: Promise<{ username: string; slug: string }> }) {
  const { username, slug } = await params

  let title = `${username}/${slug}`
  let subtitle = ''
  let badge: string | undefined

  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: prof } = await sb.from('profiles').select('id').eq('username', username).maybeSingle()
    const ownerId = (prof as { id: string } | null)?.id
    if (ownerId) {
      const { data: repo } = await sb
        .from('repositories')
        .select('title, type, price_cents')
        .eq('owner_id', ownerId)
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle()
      const r = repo as { title: string; type: string; price_cents: number | null } | null
      if (r) {
        title = ogTrim(r.title, 64)
        subtitle = `by @${username}`
        badge = r.type === 'free' ? 'FREE' : r.price_cents ? `$${(r.price_cents / 100).toFixed(0)}` : 'PAID'
      }
    }
  } catch {
    // fall back to the username/slug title
  }

  return renderOg({ eyebrow: 'repository', title, subtitle, badge })
}
