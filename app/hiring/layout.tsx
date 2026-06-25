import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hiring',
  description: 'Find vibe coders for your project, or post a job and get bids.',
  alternates: { canonical: '/hiring' },
}

export default function HireLayout({ children }: { children: React.ReactNode }) {
  return children
}
