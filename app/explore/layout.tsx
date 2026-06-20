import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Explore',
  description: 'Browse apps, components, prompts and templates built by vibe coders.',
  alternates: { canonical: '/explore' },
}

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children
}
