import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListingView } from '@/components/listing-view'
import { SITE_URL, SITE_NAME } from '@/lib/site'

interface PageProps {
  params: Promise<{ username: string; slug: string }>
}

interface ResolvedRepo {
  id: string
  title: string
  description: string | null
  type: string
  price_cents: number | null
  average_rating: number
  review_count: number
}

// Resolve a repository from its GitHub-style /<username>/<slug> URL.
// Slugs are unique per owner, so we look the owner up first.
async function resolveRepo(username: string, slug: string): Promise<ResolvedRepo | null> {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()
  if (!profile) return null

  const { data: repo } = await supabase
    .from('repositories')
    .select('id, title, description, type, price_cents, average_rating, review_count')
    .eq('owner_id', (profile as { id: string }).id)
    .eq('slug', slug)
    .maybeSingle()
  if (!repo) return null

  return repo as ResolvedRepo
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, slug } = await params
  const repo = await resolveRepo(username, slug)
  if (!repo) return { title: 'Not found' }
  return {
    title: repo.title,
    description: repo.description ?? `${username}/${slug} on Vydex.`,
    alternates: { canonical: `/${username}/${slug}` },
  }
}

export default async function RepoBySlugPage({ params }: PageProps) {
  const { username, slug } = await params
  const repo = await resolveRepo(username, slug)
  if (!repo) notFound()

  // Product structured data → rich results (price, rating) in search.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: repo.title,
    description: repo.description ?? undefined,
    url: `${SITE_URL}/${username}/${slug}`,
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      price: ((repo.price_cents ?? 0) / 100).toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Person', name: `@${username}` },
    },
    ...(repo.review_count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: repo.average_rating.toFixed(1),
            reviewCount: repo.review_count,
          },
        }
      : {}),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ListingView id={repo.id} />
    </>
  )
}
