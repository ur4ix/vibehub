import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelAvatar, colorFromId } from '@/components/pixel-avatar'
import { FollowButton } from '@/components/follow-button'
import { ProfileBody, type ProfileJob, type ProfileOrder, type RepoItem, type StatItem } from '@/components/profile-body'
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

  const [{ data: reposRaw }, { data: jobsRaw }, { data: ordersRaw }, { count: followers }, { count: following }] =
    await Promise.all([
      supabase
        .from('repositories')
        .select('id, title, slug, description, type, price_cents, tags, is_published')
        .eq('owner_id', profile.id)
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(48),
      supabase
        .from('jobs')
        .select('id, title, budget_type, budget_value, status')
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('orders')
        .select('id, title, budget, status')
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profile.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profile.id),
    ])

  return {
    profile,
    repos: (reposRaw as RepoItem[] | null) ?? [],
    jobs: (jobsRaw as ProfileJob[] | null) ?? [],
    orders: (ordersRaw as ProfileOrder[] | null) ?? [],
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
  const { profile, repos, jobs, orders, followers, following } = data

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

  const stats: StatItem[] = [
    { label: 'repos', value: repos.length, hint: 'Published repositories on this profile.' },
    { label: 'reputation', value: profile.reputation, hint: 'Points earned from sales, reviews and platform activity.' },
    { label: 'published', value: repos.length, hint: 'Repositories live and visible to everyone in Explore.' },
    { label: 'followers', value: followers, hint: 'People subscribed to this user’s new publications.', follow: 'followers' },
    { label: 'following', value: following, hint: 'People this user follows.', follow: 'following' },
    { label: 'postings', value: jobs.length + orders.length, hint: 'Jobs and orders this user posted.' },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <nav className="mb-8 font-mono text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary">~</Link>
          {' / '}
          <span className="text-foreground">@{profile.username}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* Profile card (read-only) */}
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

              <div className="mt-5 flex items-center justify-center gap-2 border-2 border-border bg-secondary px-4 py-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">reputation</span>
                <span className="font-pixel text-xs text-primary">{profile.reputation}</span>
              </div>

              <FollowButton targetUserId={profile.id} currentUserId={currentUserId} initialFollowing={isFollowing} />

              <p className="mt-5 text-center font-mono text-[10px] text-muted-foreground">
                Joined {formatJoined(profile.created_at)}
              </p>
            </div>
          </aside>

          {/* Right column — shared with /profile */}
          <ProfileBody
            userId={profile.id}
            ownerUsername={profile.username}
            stats={stats}
            repos={repos}
            jobs={jobs}
            orders={orders}
            reposHeading="Published projects"
            reposEmpty={<p className="font-mono text-sm text-muted-foreground">No published projects yet.</p>}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
