'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, ChevronDown, X } from 'lucide-react'
import { PixelButton } from './pixel-button'
import { PixelAvatar } from './pixel-avatar'
import { PublishModal } from './publish-modal'
import { useAuth } from './auth-provider'
import { createClient } from '@/lib/supabase/client'
import { openChat } from '@/lib/chat-bus'
import type { Notification } from '@/types/database'

// Guests get an all-anchor landing nav (consistent scroll behaviour); the
// actual sections (Explore, Startups, Hiring, Orders) live in the #catalog hub.
const UNAUTH_NAV = [
  { label: 'Catalog', href: '/#catalog' },
  { label: 'How it works', href: '/#how' },
  { label: 'For sellers', href: '/#sellers' },
]

const AUTH_NAV = [
  { label: 'Explore', href: '/explore' },
  { label: 'Startups', href: '/startups' },
  { label: 'Hiring', href: '/hiring' },
  { label: 'Orders', href: '/orders' },
  { label: 'Dashboard', href: '/dashboard' },
]

// Relative timestamp for notifications. Module-level (pure helper, not recreated
// per render). Reads the clock when called — fine for a transient dropdown.
function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ─── Notification Bell ────────────────────────────────────────────────────────

// Types that warrant a written reply / human contact → clicking opens a chat.
// Everything else (like, follow, fork, review…) just opens the actor's profile.
const REPLYABLE_TYPES = new Set(['message', 'interest', 'application'])

function NotificationBell() {
  const { user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  // actor_id → current username, so renames don't leave stale links.
  const [actorNames, setActorNames] = useState<Record<string, string>>({})
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  // The actor's current handle (resolved by id), falling back to the snapshot.
  const actorHandle = (n: Notification): string | null =>
    (n.actor_id ? actorNames[n.actor_id] : null) ?? n.actor_username ?? null

  // New notification bodies are name-less; prepend the current @handle. Legacy
  // bodies already start with '@', so show them as-is.
  const bodyText = (n: Notification): string => {
    const handle = actorHandle(n)
    const body = n.body ?? ''
    return handle && !body.startsWith('@') ? `@${handle} ${body}` : body
  }

  const loadNotifications = useCallback(async () => {
    if (!user) return
    const supabase = createClient()
    const { data: rawNotifs } = await supabase
      .from('notifications')
      .select('id, type, title, body, actor_username, actor_id, link, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    const notifs = (rawNotifs as Notification[] | null) ?? []
    setNotifications(notifs)

    // Resolve actors' CURRENT usernames so links survive renames.
    const actorIds = [...new Set(notifs.map((n) => n.actor_id).filter((x): x is string => !!x))]
    if (actorIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, username').in('id', actorIds)
      const map: Record<string, string> = {}
      for (const p of (profs as { id: string; username: string }[] | null) ?? []) map[p.id] = p.username
      setActorNames(map)
    }
  }, [user])

  // Live updates: subscribe to new notifications (RLS-filtered to me) + a slow
  // poll as a fallback in case realtime isn't enabled.
  useEffect(() => {
    if (!user) return
    // Initial load; setState resolves async, then realtime + poll keep it fresh.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNotifications()
    const supabase = createClient()
    const channel = supabase
      .channel(`notif:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => loadNotifications())
      .subscribe()
    const interval = setInterval(loadNotifications, 30000)
    return () => { supabase.removeChannel(channel); clearInterval(interval) }
  }, [user, loadNotifications])

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  async function markAllRead() {
    if (!user) return
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  // Click a notification → open a chat with whoever triggered it (bid, interest,
  // follow, like, review…); mark it read and close the panel.
  async function handleNotificationClick(n: Notification) {
    setOpen(false)
    if (!n.is_read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
      const supabase = createClient()
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
    }
    // A deep link (e.g. a bid → its order page) always wins.
    if (n.link) { router.push(n.link); return }
    const handle = actorHandle(n)
    if (!handle) return
    if (REPLYABLE_TYPES.has(n.type)) {
      openChat(handle)
    } else {
      router.push(`/u/${handle}`)
    }
  }


  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount ? ` — ${unreadCount} unread` : ''}`}
        className="relative grid h-9 w-9 place-items-center border-2 border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center border border-background bg-primary font-pixel text-[8px] text-primary-foreground">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 origin-top-right animate-pop border-2 border-border bg-card pixel-shadow-border z-50">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-pixel text-[9px] uppercase tracking-wider">Notifications</span>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="font-mono text-[10px] text-muted-foreground hover:text-primary"
                >
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
              <p className="font-mono text-xs text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id} className="border-b border-border last:border-0">
                  <button
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className={'block w-full px-4 py-3.5 text-left transition-colors hover:bg-secondary ' + (!n.is_read ? 'bg-primary/5' : '')}
                  >
                    <div className="flex items-start gap-3">
                      {!n.is_read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-primary" />}
                      <div className={'min-w-0 ' + (!n.is_read ? '' : 'pl-[18px]')}>
                        <p className="font-pixel text-[9px] uppercase tracking-wider text-foreground">{n.title}</p>
                        {n.body && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{bodyText(n)}</p>}
                        <div className="mt-1.5 flex items-center gap-2">
                          <p className="font-mono text-[10px] text-muted-foreground/60">{timeAgo(n.created_at)}</p>
                          {actorHandle(n) && (
                            <span className="font-mono text-[10px] text-primary">
                              · {REPLYABLE_TYPES.has(n.type) ? 'reply' : 'view profile'} →
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}


// ─── SiteHeader ───────────────────────────────────────────────────────────────

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const { user, signOut } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  // Is the signed-in user an admin? (decides whether to show the Admin link)
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    let active = true
    supabase.rpc('is_admin').then(({ data }) => { if (active) setIsAdmin(Boolean(data)) })
    return () => { active = false }
  }, [user])

  const menuItems = [
    { label: 'Profile', href: user ? `/u/${user.username}` : '/profile' },
    { label: 'Security settings', href: '/settings/security' },
    { label: 'Dashboard', href: '/dashboard' },
    ...(isAdmin ? [{ label: 'Admin panel', href: '/admin' }] : []),
  ]

  const navLinks = user ? AUTH_NAV : UNAUTH_NAV

  return (
    <>
      <header className="sticky top-0 z-50 border-b-2 border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3" aria-label="Vydex — home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" aria-hidden="true" className="h-8 w-8 shrink-0 border-2 border-border" />
            <span className="font-pixel text-xs tracking-tight">VYDEX</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Desktop right — authenticated */}
          {user ? (
            <div className="hidden items-center gap-3 md:flex">
              <NotificationBell />

              <PixelButton className="px-4 py-2.5" onClick={() => setPublishOpen(true)}>
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
                  <PixelAvatar username={user.username} avatarColor={user.avatarColor} size={28} imageUrl={user.avatarUrl} />
                  <span className="font-mono text-xs">{user.username}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>

                {menuOpen && (
                  <div role="menu" className="absolute right-0 mt-2 w-52 origin-top-right animate-pop border-2 border-border bg-card pixel-shadow-border z-50">
                    <div className="border-b border-border px-4 py-3">
                      <p className="font-pixel text-[9px] text-foreground">{user.username}</p>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                    {menuItems.map((item) => (
                      <Link
                        key={item.href}
                        role="menuitem"
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="block border-b border-border px-4 py-3 font-mono text-xs transition-colors hover:bg-secondary hover:text-primary"
                      >
                        {item.label}
                      </Link>
                    ))}
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
            </div>
          ) : (
            <div className="hidden items-center gap-3 md:flex">
              <Link href="/auth" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Sign in
              </Link>
              <PixelButton className="px-4 py-2.5" onClick={() => router.push('/auth')}>
                Get started
              </PixelButton>
            </div>
          )}

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
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="border-b border-border py-3 text-sm text-muted-foreground last:border-0 hover:text-primary"
                >
                  {l.label}
                </Link>
              ))}

              {user ? (
                <div className="flex flex-col gap-2 py-3">
                  <Link
                    href={`/u/${user.username}`}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 border-2 border-border bg-background px-3 py-2.5"
                  >
                    <PixelAvatar username={user.username} avatarColor={user.avatarColor} size={28} imageUrl={user.avatarUrl} />
                    <span className="font-mono text-sm">{user.username}</span>
                  </Link>
                  <div className="flex gap-3">
                    <PixelButton
                      className="flex-1 px-4 py-2.5"
                      onClick={() => { setPublishOpen(true); setMobileOpen(false) }}
                    >
                      + Publish
                    </PixelButton>
                    <PixelButton
                      variant="outline"
                      className="flex-1 px-4 py-2.5"
                      onClick={() => { signOut(); setMobileOpen(false) }}
                    >
                      Sign out
                    </PixelButton>
                  </div>
                  <Link
                    href="/settings/security"
                    onClick={() => setMobileOpen(false)}
                    className="border-2 border-border px-4 py-2.5 text-center font-mono text-xs text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    Security settings
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="border-2 border-primary bg-primary/10 px-4 py-2.5 text-center font-mono text-xs text-primary hover:bg-primary/20"
                    >
                      Admin panel
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex gap-3 py-3">
                  <PixelButton variant="outline" className="flex-1 px-4 py-2.5"
                    onClick={() => { router.push('/auth'); setMobileOpen(false) }}>
                    Sign in
                  </PixelButton>
                  <PixelButton className="flex-1 px-4 py-2.5"
                    onClick={() => { router.push('/auth'); setMobileOpen(false) }}>
                    Get started
                  </PixelButton>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      {publishOpen && <PublishModal onClose={() => setPublishOpen(false)} />}
    </>
  )
}
