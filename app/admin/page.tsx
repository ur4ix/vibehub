import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AdminOverview() {
  const supabase = await createClient()
  const head = { count: 'exact' as const, head: true }

  const [u, r, pub, j, o, p] = await Promise.all([
    supabase.from('users').select('id', head),
    supabase.from('repositories').select('id', head),
    supabase.from('repositories').select('id', head).eq('is_published', true),
    supabase.from('jobs').select('id', head),
    supabase.from('orders').select('id', head),
    supabase.from('posts').select('id', head),
  ])

  const users = u.count ?? 0
  const repos = r.count ?? 0
  const publishedRepos = pub.count ?? 0
  const jobs = j.count ?? 0
  const orders = o.count ?? 0
  const posts = p.count ?? 0

  const stats: { label: string; value: number; href?: string; hint?: string }[] = [
    { label: 'Users', value: users, href: '/admin/users' },
    { label: 'Repositories', value: repos, hint: `${publishedRepos} published` },
    { label: 'Jobs', value: jobs },
    { label: 'Orders', value: orders },
    { label: 'Blog posts', value: posts },
  ]

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => {
          const inner = (
            <>
              <p className="font-pixel text-2xl text-primary">{s.value}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
              {s.hint && <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">{s.hint}</p>}
            </>
          )
          return s.href ? (
            <Link
              key={s.label}
              href={s.href}
              className="border-2 border-border bg-card p-5 transition-all duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-primary pixel-shadow-border"
            >
              {inner}
            </Link>
          ) : (
            <div key={s.label} className="border-2 border-border bg-card p-5">
              {inner}
            </div>
          )
        })}
      </div>

      <div className="mt-8 border-2 border-dashed border-border bg-card/40 p-6">
        <p className="font-pixel text-[10px] uppercase tracking-wider text-muted-foreground">Quick links</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/admin/users" className="font-mono text-xs text-primary hover:underline">Manage users →</Link>
          <Link href="/admin/activity" className="font-mono text-xs text-primary hover:underline">Recent activity →</Link>
        </div>
      </div>
    </div>
  )
}
