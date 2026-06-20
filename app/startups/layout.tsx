import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Startups',
  description: 'Discover startups built by vibe coders and connect with founders and investors.',
  alternates: { canonical: '/startups' },
}

export default function StartupsLayout({ children }: { children: React.ReactNode }) {
  return children
}
