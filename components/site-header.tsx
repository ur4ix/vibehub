'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PixelButton } from './pixel-button'
import { PixelAvatar } from './pixel-avatar'
import { useAuth } from './auth-provider'

const NAV_LINKS = [
  { label: 'Catalog', href: '/#catalog' },
  { label: 'How it works', href: '/#how' },
  { label: 'For sellers', href: '/#sellers' },
]

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b-2 border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3" aria-label="VibeHub — home">
          <span
            className="grid h-8 w-8 place-items-center border-2 border-primary bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <span className="font-pixel text-[12px]">{'>'}</span>
          </span>
          <span className="font-pixel text-xs tracking-tight">VIBEHUB</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop right */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <PixelButton
                className="px-4 py-2.5"
                onClick={() => router.push('/upload')}
              >
                + Publish
              </PixelButton>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 border-2 border-border bg-card py-1.5 pl-1.5 pr-3 transition-colors hover:border-primary"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="User menu"
                >
                  <PixelAvatar username={user.username} avatarColor={user.avatarColor} size={28} />
                  <span className="font-mono text-xs">{user.username}</span>
                  <span className="font-pixel text-[8px] text-muted-foreground">v</span>
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-48 border-2 border-border bg-card pixel-shadow-border"
                  >
                    <Link
                      role="menuitem"
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="block border-b border-border px-4 py-3 font-mono text-xs transition-colors hover:bg-secondary hover:text-primary"
                    >
                      My profile
                    </Link>
                    <Link
                      role="menuitem"
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="block border-b border-border px-4 py-3 font-mono text-xs transition-colors hover:bg-secondary hover:text-primary"
                    >
                      Dashboard
                    </Link>
                    <button
                      role="menuitem"
                      onClick={() => { signOut(); setMenuOpen(false) }}
                      className="block w-full px-4 py-3 text-left font-mono text-xs text-destructive transition-colors hover:bg-secondary"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/auth"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              <PixelButton className="px-4 py-2.5" onClick={() => router.push('/auth')}>
                Get started
              </PixelButton>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="grid h-9 w-9 place-items-center border-2 border-border text-foreground md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          <span className="font-pixel text-[12px]">{mobileOpen ? 'X' : '='}</span>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t-2 border-border bg-card md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2" aria-label="Mobile navigation">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="border-b border-border py-3 text-sm text-muted-foreground last:border-0 hover:text-primary"
              >
                {l.label}
              </a>
            ))}

            {user ? (
              <div className="flex flex-col gap-2 py-3">
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 border-2 border-border bg-background px-3 py-2.5"
                >
                  <PixelAvatar username={user.username} avatarColor={user.avatarColor} size={28} />
                  <span className="font-mono text-sm">{user.username}</span>
                </Link>
                <div className="flex gap-3">
                  <PixelButton
                    className="flex-1 px-4 py-2.5"
                    onClick={() => { router.push('/upload'); setMobileOpen(false) }}
                  >
                    Publish
                  </PixelButton>
                  <PixelButton
                    variant="outline"
                    className="flex-1 px-4 py-2.5"
                    onClick={() => { signOut(); setMobileOpen(false) }}
                  >
                    Sign out
                  </PixelButton>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 py-3">
                <PixelButton
                  variant="outline"
                  className="flex-1 px-4 py-2.5"
                  onClick={() => { router.push('/auth'); setMobileOpen(false) }}
                >
                  Sign in
                </PixelButton>
                <PixelButton
                  className="flex-1 px-4 py-2.5"
                  onClick={() => { router.push('/auth'); setMobileOpen(false) }}
                >
                  Get started
                </PixelButton>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
