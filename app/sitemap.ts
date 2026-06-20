import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { SITE_URL } from '@/lib/site'

// Refresh hourly so newly published listings get discovered quickly.
export const revalidate = 3600

const STATIC_PATHS = [
  '', '/explore', '/hire', '/orders', '/startups',
  '/blog', '/about', '/docs', '/contact', '/terms', '/privacy',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: p === '' ? 1 : 0.7,
  }))

  try {
    // Anon client — reads only public data (RLS: published repos, profiles view,
    // startups). No cookies needed, so it works during static generation.
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Published repos → /<username>/<slug>
    const { data: repoRaw } = await sb
      .from('repositories')
      .select('slug, owner_id, updated_at')
      .eq('is_published', true)
      .limit(5000)
    const repos = (repoRaw as { slug: string; owner_id: string; updated_at: string | null }[] | null) ?? []

    const ownerIds = [...new Set(repos.map((r) => r.owner_id))]
    const username = new Map<string, string>()
    if (ownerIds.length > 0) {
      const { data: profRaw } = await sb.from('profiles').select('id, username').in('id', ownerIds)
      for (const p of (profRaw as { id: string; username: string }[] | null) ?? []) username.set(p.id, p.username)
    }
    for (const r of repos) {
      const u = username.get(r.owner_id)
      if (!u) continue
      entries.push({
        url: `${SITE_URL}/${u}/${r.slug}`,
        lastModified: r.updated_at ? new Date(r.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }

    // Public profiles → /u/<username>
    const { data: allProfRaw } = await sb.from('profiles').select('username').limit(5000)
    for (const p of (allProfRaw as { username: string }[] | null) ?? []) {
      entries.push({ url: `${SITE_URL}/u/${p.username}`, changeFrequency: 'weekly', priority: 0.5 })
    }

    // Startups → /startups/<id>
    const { data: startupRaw } = await sb.from('startups').select('id, created_at').limit(2000)
    for (const s of (startupRaw as { id: string; created_at: string | null }[] | null) ?? []) {
      entries.push({
        url: `${SITE_URL}/startups/${s.id}`,
        lastModified: s.created_at ? new Date(s.created_at) : now,
        changeFrequency: 'monthly',
        priority: 0.4,
      })
    }
  } catch {
    // On any failure, still return the static routes.
  }

  return entries
}
