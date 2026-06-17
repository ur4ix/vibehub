import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelAvatar, colorFromId } from '@/components/pixel-avatar'
import { FollowButton } from '@/components/follow-button'
import { createClient } from '@/lib/supabase/server'

interface PageProps {
  params: Promise<{ username: string }>
}

interface PublicProfile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  reputation: number
  created_at: string
}

interface ProfileRepo {
  id: string
  title: string
  slug: string
  description: string | null
  type: 'free' | 'paid'
  price_cents: number | null
  tags: string[]
  category: string | null
}

function formatJoined(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

async function getProfile(username: string) {
  const supabase = await createClient()
  // public.profiles is the anon-readable view (no private columns).
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, reputation, created_at')
    .eq('username', username)
    .maybeSingle()

  const profile = profileRaw as PublicProfile | null
  if (!profile) return null

  const { data: reposRaw } = await supabase
    .from('repositories')
    .select('id, title, slug, description, type, price_cents, tags, category')
    .eq('owner_id', profile.id)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(48)

  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profile.id),
  ])

  return {
    profile,
    repos: (reposRaw as ProfileRepo[] | null) ?? [],
    followers: followers ?? 0,
    following: following ?? 0,
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  const data = await getProfile(username)
  if (!data) return { title: 'Profile not found — Vydex' }
  const name = data.profile.display_name ?? data.profile.username
  return {
    title: `${name} (@${data.profile.username}) — Vydex`,
    description: data.profile.bio ?? `Projects published by @${data.profile.username} on Vydex.`,
  }
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params
  const data = await getProfile(username)
  if (!data) notFound()
  const { profile, repos, followers, following } = data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const currentUserId = user?.id ?? null
  let isFollowing = false
  if (user && user.id !== profile.id) {
    const { data: f } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .maybeSingle()
    isFollowing = Boolean(f)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <nav className="mb-8 font-mono text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary">~</Link>
          {' / '}
          <span className="text-foreground">@{profile.username}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          {/* Profile card */}
          <aside>
            <div className="border-2 border-border bg-card p-6 pixel-shadow-border">
              <div className="flex flex-col items-center text-center">
                <PixelAvatar
                  username={profile.username}
                  avatarColor={colorFromId(profile.id)}
                  size={88}
                  className="!border-4"
                  imageUrl={profile.avatar_url}
                />
                <h1 className="mt-5 font-pixel text-sm leading-[1.5]">
                  {profile.display_name ?? profile.username}
                </h1>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">@{profile.username}</p>
              </div>

              {profile.bio && (
                <p className="mt-5 text-pretty text-sm leading-relaxed text-foreground">{profile.bio}</p>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  { v: profile.reputation, l: 'rep' },
                  { v: repos.length, l: 'repos' },
                  { v: followers, l: 'followers' },
                  { v: following, l: 'following' },
                ].map((s) => (
                  <div key={s.l} className="border-2 border-border bg-background px-3 py-3 text-center">
                    <div className="font-pixel text-sm text-primary">{s.v}</div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
                  </div>
                ))}
              </div>

              <FollowButton targetUserId={profile.id} currentUserId={currentUserId} initialFollowing={isFollowing} />

              <p className="mt-5 text-center font-mono text-[10px] text-muted-foreground">
                Joined {formatJoined(profile.created_at)}
              </p>
            </div>
          </aside>

          {/* Repos */}
          <section>
            <h2 className="font-pixel text-xs uppercase tracking-wider">Published projects</h2>

            {repos.length === 0 ? (
              <div className="mt-5 border-2 border-dashed border-border p-12 text-center">
                <p className="font-mono text-sm text-muted-foreground">No published projects yet.</p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {repos.map((r) => (
                  <Link
                    key={r.id}
                    href={`/listing/${r.id}`}
                    className="group flex flex-col border-2 border-border bg-card p-5 transition-all duration-100 hover:border-primary hover:pixel-shadow-border"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-mono text-sm text-foreground group-hover:text-primary">
                        {profile.username}/{r.slug}
                      </h3>
                      <span className="shrink-0 border-2 border-green-400/50 bg-green-400/10 px-2 py-0.5 font-pixel text-[9px] text-green-400">
                        {r.type === 'free' ? 'Free' : r.price_cents ? `$${(r.price_cents / 100).toFixed(0)}` : 'Paid'}
                      </span>
                    </div>
                    {r.description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{r.description}</p>
                    )}
                    {r.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {r.tags.slice(0, 4).map((t) => (
                          <span key={t} className="border border-border bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
