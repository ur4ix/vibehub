'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { PixelAvatar, colorFromId } from '@/components/pixel-avatar'
import { createClient } from '@/lib/supabase/client'

export type FollowTab = 'followers' | 'following'

interface Person {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

export function FollowersModal({
  userId,
  initialTab,
  onClose,
}: {
  userId: string
  initialTab: FollowTab
  onClose: () => void
}) {
  const [tab, setTab] = useState<FollowTab>(initialTab)
  const [people, setPeople] = useState<Person[] | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      setPeople(null)
      const supabase = createClient()
      // follows is publicly readable; resolve the other side then load profiles.
      const col = tab === 'followers' ? 'follower_id' : 'following_id'
      const filter = tab === 'followers' ? 'following_id' : 'follower_id'
      const { data: rows } = await supabase
        .from('follows')
        .select(col)
        .eq(filter, userId)
        .limit(200)
      const ids = ((rows as Record<string, string>[] | null) ?? []).map((r) => r[col])
      if (ids.length === 0) { if (active) setPeople([]); return }
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', ids)
      if (active) setPeople((profs as Person[] | null) ?? [])
    })()
    return () => { active = false }
  }, [tab, userId])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="animate-modal flex max-h-[80vh] w-full max-w-sm flex-col border-2 border-border bg-card pixel-shadow-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tabs */}
        <div className="flex items-center justify-between border-b-2 border-border">
          <div className="flex">
            {(['followers', 'following'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={
                  'px-4 py-3 font-pixel text-[9px] uppercase tracking-wider transition-colors ' +
                  (tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')
                }
              >
                {t}
              </button>
            ))}
          </div>
          <button onClick={onClose} aria-label="Close" className="px-4 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {people === null ? (
            <p className="px-4 py-10 text-center font-mono text-xs text-muted-foreground">Loading…</p>
          ) : people.length === 0 ? (
            <p className="px-4 py-10 text-center font-mono text-xs text-muted-foreground">
              {tab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </p>
          ) : (
            <ul>
              {people.map((p) => (
                <li key={p.id} className="border-b border-border last:border-0">
                  <Link
                    href={`/u/${p.username}`}
                    onClick={onClose}
                    className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary"
                  >
                    <PixelAvatar
                      username={p.username}
                      avatarColor={colorFromId(p.id)}
                      size={32}
                      imageUrl={p.avatar_url ?? undefined}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm text-foreground group-hover:text-primary">
                        {p.display_name ?? p.username}
                      </p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">@{p.username}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
