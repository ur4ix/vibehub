import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListingView } from '@/components/listing-view'

interface PageProps {
  params: Promise<{ username: string; slug: string }>
}

// Resolve a repository from its GitHub-style /<username>/<slug> URL.
// Slugs are unique per owner, so we look the owner up first.
async function resolveRepo(username: string, slug: string) {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', username)
    .maybeSingle()
  if (!profile) return null

  const { data: repo } = await supabase
    .from('repositories')
    .select('id, title, description')
    .eq('owner_id', (profile as { id: string }).id)
    .eq('slug', slug)
    .maybeSingle()
  if (!repo) return null

  return repo as { id: string; title: string; description: string | null }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, slug } = await params
  const repo = await resolveRepo(username, slug)
  if (!repo) return { title: 'Not found' }
  return {
    title: `${repo.title}`,
    description: repo.description ?? `${username}/${slug} on Vydex.`,
  }
}

export default async function RepoBySlugPage({ params }: PageProps) {
  const { username, slug } = await params
  const repo = await resolveRepo(username, slug)
  if (!repo) notFound()
  return <ListingView id={repo.id} />
}
