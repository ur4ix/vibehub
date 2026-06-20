import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Orders',
  description: 'Commission a custom build, or take on open order requests.',
  alternates: { canonical: '/orders' },
}

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children
}
