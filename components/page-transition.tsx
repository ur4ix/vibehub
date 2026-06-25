'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// Lightweight route-change transition: re-key on pathname so each navigation
// replays a cheap opacity fade. No View Transitions API snapshot (which was
// heavy on this shadow/blur-heavy UI and could stall slow navigations).
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  )
}
