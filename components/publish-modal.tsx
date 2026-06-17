'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

const CARDS = [
  {
    icon: '▢',
    title: 'Upload Repository',
    description: 'Publish your code — sell it, open-source it, or let others fork it.',
    href: '/upload',
    tag: 'Code',
  },
  {
    icon: '◈',
    title: 'Post a Job',
    description: 'Find a vibe coder for your project — offer equity or credit.',
    href: '/hire/new',
    tag: 'Hiring',
  },
  {
    icon: '◧',
    title: 'Create Order',
    description: 'Commission a project at a fixed price. Define scope, pay on delivery.',
    href: '/orders/new',
    tag: 'Order',
  },
]

export function PublishModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose()
  }

  function go(href: string) {
    onClose()
    router.push(href)
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-[100] flex animate-fade-in items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="relative mx-4 w-full max-w-2xl animate-modal border-2 border-border bg-card pixel-shadow-border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// publish'}</span>
            <h2 className="mt-1 font-pixel text-xs">What would you like to create?</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center border-2 border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cards */}
        <div className="grid gap-0 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {CARDS.map((card) => (
            <button
              key={card.href}
              onClick={() => go(card.href)}
              className="group flex flex-col items-start gap-4 p-6 text-left transition-colors hover:bg-secondary"
            >
              <div className="flex w-full items-start justify-between">
                <span className="grid h-10 w-10 place-items-center border-2 border-border bg-background font-pixel text-lg text-primary group-hover:border-primary">
                  {card.icon}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{card.tag}</span>
              </div>
              <div>
                <p className="font-pixel text-[10px] leading-[1.6] text-foreground group-hover:text-primary">
                  {card.title}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {card.description}
                </p>
              </div>
              <span className="mt-auto font-mono text-xs text-muted-foreground transition-colors group-hover:text-primary">
                →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
