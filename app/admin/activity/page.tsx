import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default async function AdminActivityPage() {
  const supabase = await createClient()

  const [usersR, reposR, postsR] = await Promise.all([
    supabase.from('users').select('id, username, created_at').order('created_at', { ascending: false }).limit(12),
    supabase.from('repositories').select('id, title, is_published, created_at').order('created_at', { ascending: false }).limit(12),
    supabase.from('posts').select('id, title, slug, status, created_at').order('created_at', { ascending: false }).limit(12),
  ])

  const users = (usersR.data as { id: string; username: string; created_at: string }[] | null) ?? []
  const repos = (reposR.data as { id: string; title: string; is_published: boolean; created_at: string }[] | null) ?? []
  const posts = (postsR.data as { id: string; title: string; slug: string; status: string; created_at: string }[] | null) ?? []

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* New users */}
      <section>
        <h2 className="mb-3 font-pixel text-[10px] uppercase tracking-wider">New users</h2>
        <div className="flex flex-col gap-2">
          {users.length === 0 && <p className="font-mono text-xs text-muted-foreground">Nothing yet.</p>}
          {users.map((u) => (
            <Link key={u.id} href={`/u/${u.username}`} className="group border-2 border-border bg-card p-3 transition-colors hover:border-primary">
              <p className="truncate font-mono text-xs text-foreground group-hover:text-primary">@{u.username}</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">{timeAgo(u.created_at)}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* New repositories */}
      <section>
        <h2 className="mb-3 font-pixel text-[10px] uppercase tracking-wider">New repositories</h2>
        <div className="flex flex-col gap-2">
          {repos.length === 0 && <p className="font-mono text-xs text-muted-foreground">Nothing yet.</p>}
          {repos.map((r) => (
            <Link key={r.id} href={`/listing/${r.id}`} className="group border-2 border-border bg-card p-3 transition-colors hover:border-primary">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-mono text-xs text-foreground group-hover:text-primary">{r.title}</p>
                {!r.is_published && <span className="shrink-0 border border-border px-1.5 font-pixel text-[8px] text-muted-foreground">draft</span>}
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">{timeAgo(r.created_at)}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* New posts */}
      <section>
        <h2 className="mb-3 font-pixel text-[10px] uppercase tracking-wider">New blog posts</h2>
        <div className="flex flex-col gap-2">
          {posts.length === 0 && <p className="font-mono text-xs text-muted-foreground">Nothing yet.</p>}
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="group border-2 border-border bg-card p-3 transition-colors hover:border-primary">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-mono text-xs text-foreground group-hover:text-primary">{p.title}</p>
                {p.status !== 'published' && <span className="shrink-0 border border-border px-1.5 font-pixel text-[8px] text-muted-foreground">{p.status}</span>}
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">{timeAgo(p.created_at)}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
