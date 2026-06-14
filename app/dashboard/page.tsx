import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import type { Profile } from '@/types/database'

export const metadata: Metadata = {
  title: 'Dashboard — VibeHub',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle() as { data: Profile | null; error: unknown }

  const { data: repos } = await supabase
    .from('repositories')
    .select('id, title, slug, type, price_cents, is_published, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">
              // dashboard
            </span>
            <h1 className="mt-3 font-pixel text-lg">
              {profile?.display_name ?? profile?.username ?? user.email}
            </h1>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              @{profile?.username} · reputation {profile?.reputation ?? 0}
            </p>
          </div>
          <Link
            href="/upload"
            className="font-pixel inline-flex items-center justify-center gap-2 border-2 px-5 py-3 text-[10px] uppercase leading-none tracking-wider border-primary bg-primary text-primary-foreground pixel-shadow-border transition-all duration-100 hover:brightness-110 active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            + Publish
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-10">
          <div className="border-2 border-border bg-card px-4 py-3 text-center">
            <div className="font-pixel text-sm text-primary">{repos?.length ?? 0}</div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">repos</div>
          </div>
          <div className="border-2 border-border bg-card px-4 py-3 text-center">
            <div className="font-pixel text-sm text-primary">
              {repos?.filter((r) => r.is_published).length ?? 0}
            </div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">published</div>
          </div>
          <div className="border-2 border-border bg-card px-4 py-3 text-center">
            <div className="font-pixel text-sm text-primary">{profile?.reputation ?? 0}</div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">reputation</div>
          </div>
        </div>

        <h2 className="font-pixel text-xs uppercase tracking-wider mb-5">Repositories</h2>

        {!repos || repos.length === 0 ? (
          <div className="border-2 border-border border-dashed p-10 text-center">
            <p className="font-mono text-sm text-muted-foreground">
              No repositories yet.{' '}
              <Link href="/upload" className="text-primary hover:underline">
                Publish your first project
              </Link>
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {repos.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-2 border-border bg-card px-5 py-4 gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-sm text-foreground truncate">{r.slug ?? r.title}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-pixel text-[9px] text-primary">
                    {r.type === 'free' ? 'Free' : r.price_cents ? `$${(r.price_cents / 100).toFixed(0)}` : 'Paid'}
                  </span>
                  <span className={
                    'border-2 px-2 py-1 font-pixel text-[8px] uppercase ' +
                    (r.is_published ? 'border-primary text-primary' : 'border-border text-muted-foreground')
                  }>
                    {r.is_published ? 'live' : 'draft'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
