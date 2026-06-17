'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Global, automatic scroll-reveal. On each route it hides the top-level blocks
// of <main> that start BELOW the fold, then fades + lifts them in as they scroll
// into view. Above-the-fold content is never touched, so there's no flash.
export function ScrollReveal() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let observer: IntersectionObserver | null = null

    // Wait a tick so the new route's DOM is in place.
    const timer = window.setTimeout(() => {
      const main = document.querySelector('main')
      if (!main) return

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('reveal-in')
              observer?.unobserve(entry.target)
            }
          }
        },
        { threshold: 0.08, rootMargin: '0px 0px -8% 0px' },
      )

      const fold = window.innerHeight * 0.88
      const big = window.innerHeight * 1.2

      // Pick the blocks to reveal. If a top-level child is taller than the
      // viewport (a big wrapper/section/grid), descend one level so we animate
      // its inner blocks instead of the whole thing at once.
      const targets: Element[] = []
      main.querySelectorAll(':scope > *').forEach((el) => {
        if ((el as HTMLElement).offsetHeight > big) {
          const children = el.querySelectorAll(':scope > *')
          if (children.length > 1) {
            children.forEach((child) => targets.push(child))
            return
          }
        }
        targets.push(el)
      })

      targets.forEach((el) => {
        if (el.getBoundingClientRect().top > fold) {
          el.classList.add('reveal-pending')
          observer!.observe(el)
        }
      })
    }, 80)

    return () => {
      window.clearTimeout(timer)
      observer?.disconnect()
    }
  }, [pathname])

  return null
}
