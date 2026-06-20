import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { ProfileCard } from '@/components/profile-card'
import { ProfileBody, type ProfileJob, type ProfileOrder, type RepoItem, type StatItem } from '@/components/profile-body'
import { earnedBadges, manualBadges } from '@/lib/badges'
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
  github_username: string | null
  x_username: string | null
}

async function getProfileRow(username: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, reputation, created_at, github_username, x_username')
    .eq('username', username)
    .maybeSingle()
  return data as PublicProfile | null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  const profile = await getProfileRow(username)
  if (!profile) return { title: 'Profile not found' }
  const name = profile.display_name ?? profile.username
  return {
    title: `${name} (@${profile.username})`,
    description: profile.bio ?? `Projects published by @${profile.username} on Vydex.`,
  }
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params
  const supabase = await createClient()

  const profile = await getProfileRow(username)
  if (!profile) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const currentUserId = user?.id ?? null
  const isOwner = currentUserId === profile.id

  // Owner sees their drafts too; visitors only published repos.
  let repoQuery = supabase
    .from('repositories')
    .select('id, title, slug, description, type, price_cents, tags, is_published')
    .eq('owner_id', profile.id)
  repoQuery = isOwner
    ? repoQuery.order('created_at', { ascending: false })
    : repoQuery.eq('is_published', true).order('published_at', { ascending: false })

  const [{ data: reposRaw }, { data: jobsRaw }, { data: ordersRaw }, { count: followers }, { count: following }, { data: rolesRaw }, { count: reviewsWritten }, { data: badgeRows }] =
    await Promise.all([
      repoQuery.limit(48),
      supabase.from('jobs').select('id, title, budget_type, budget_value, status').eq('owner_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('orders').select('id, title, budget, status').eq('owner_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profile.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profile.id),
      // RLS exposes partner/investor publicly; admin only to self/admins.
      supabase.from('user_roles').select('role').eq('user_id', profile.id),
      supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('reviewer_id', profile.id),
      supabase.from('account_badges').select('badge').eq('user_id', profile.id),
    ])

  const repos = (reposRaw as RepoItem[] | null) ?? []
  const jobs = (jobsRaw as ProfileJob[] | null) ?? []
  const orders = (ordersRaw as ProfileOrder[] | null) ?? []
  const roles = ((rolesRaw as { role: string }[] | null) ?? []).map((r) => r.role)
  const publishedCount = repos.filter((r) => r.is_published).length

  // Badges: earned (derived) + manual (admin-assigned).
  const earned = earnedBadges({
    createdAt: profile.created_at,
    reputation: profile.reputation,
    publishedRepos: publishedCount,
    followers: followers ?? 0,
    reviewsWritten: reviewsWritten ?? 0,
  })
  const manual = manualBadges(((badgeRows as { badge: string }[] | null) ?? []).map((b) => b.badge))
  const badges = [...manual, ...earned]

  let isFollowing = false
  if (user && !isOwner) {
    const { data: f } = await supabase
      .from('follows').select('id').eq('follower_id', user.id).eq('following_id', profile.id).maybeSingle()
    isFollowing = Boolean(f)
  }

  const stats: StatItem[] = [
    { label: 'repos', value: repos.length, hint: isOwner ? 'All repositories you own — published and drafts.' : 'Published repositories on this profile.' },
    { label: 'reputation', value: profile.reputation, hint: 'Points earned from sales, reviews and platform activity.' },
    { label: 'published', value: publishedCount, hint: 'Repositories live and visible to everyone in Explore.' },
    { label: 'followers', value: followers ?? 0, hint: isOwner ? 'People subscribed to your new publications.' : 'People subscribed to this user’s new publications.', follow: 'followers' },
    { label: 'following', value: following ?? 0, hint: isOwner ? 'People whose publications you follow.' : 'People this user follows.', follow: 'following' },
    { label: 'postings', value: jobs.length + orders.length, hint: 'Jobs and orders posted on the Hire and Orders boards.' },
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
          <aside>
            <ProfileCard
              userId={profile.id}
              initialUsername={profile.username}
              initialDisplayName={profile.display_name}
              initialAvatarUrl={profile.avatar_url}
              initialBio={profile.bio}
              reputation={profile.reputation}
              createdAt={profile.created_at}
              githubUsername={profile.github_username}
              xUsername={profile.x_username}
              roles={roles}
              badges={badges}
              isOwner={isOwner}
              currentUserId={currentUserId}
              isFollowing={isFollowing}
            />
          </aside>

          <ProfileBody
            userId={profile.id}
            ownerUsername={profile.username}
            stats={stats}
            repos={repos}
            jobs={jobs}
            orders={orders}
            reposHeading={isOwner ? 'Repositories' : 'Published projects'}
            reposEmpty={
              isOwner ? (
                <p className="font-mono text-sm text-muted-foreground">
                  No repositories yet.{' '}
                  <Link href="/upload" className="text-primary hover:underline">Publish your first project</Link>
                </p>
              ) : (
                <p className="font-mono text-sm text-muted-foreground">No published projects yet.</p>
              )
            }
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
