'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// Re-keys on pathname so each navigation replays the enter animation.
// Opacity-only (no transform) to avoid breaking the sticky header's positioning.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  )
}
