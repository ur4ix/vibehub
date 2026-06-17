import { ListingView } from '@/components/listing-view'

// Canonical pretty URL is /<username>/<slug>; this id-based route stays for
// back-compat and for places that only have the repo id (e.g. just created).
export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ListingView id={id} />
}
