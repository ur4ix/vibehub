'use client'

import * as React from 'react'
import type { ReactNode } from 'react'

// React's experimental <ViewTransition>, enabled via next.config
// `experimental.viewTransition`. Next aliases `react` to the experimental
// channel that provides it. Route navigations are React Transitions, so wrapping
// the page in <ViewTransition> makes the browser crossfade old → new
// automatically. Falls back to a plain wrapper if it's unavailable (e.g. a
// browser without the View Transitions API), where navigation is just instant.
const ReactViewTransition = (React as unknown as {
  ViewTransition?: React.ComponentType<{ children?: ReactNode }>
}).ViewTransition

export function PageTransition({ children }: { children: ReactNode }) {
  if (!ReactViewTransition) return <>{children}</>
  return <ReactViewTransition>{children}</ReactViewTransition>
}
