'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelAvatar, colorFromId } from '@/components/pixel-avatar'
import { useAuth } from '@/components/auth-provider'
import { createClient } from '@/lib/supabase/client'

interface Row {
  id: string
  sender_id: string
  recipient_id: string
  body: string
  is_read: boolean
  created_at: string
}
interface Conversation {
  otherId: string
  username: string
  display_name: string | null
  avatar_url: string | null
  lastBody: string
  lastAt: string
  unread: number
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function MessagesPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [convos, setConvos] = useState<Conversation[] | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/auth')
  }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, recipient_id, body, is_read, created_at')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(300)
      const rows = (data as Row[] | null) ?? []

      const byOther = new Map<string, Conversation>()
      for (const m of rows) {
        const otherId = m.sender_id === user.id ? m.recipient_id : m.sender_id
        const existing = byOther.get(otherId)
        const unreadInc = m.recipient_id === user.id && !m.is_read ? 1 : 0
        if (!existing) {
          byOther.set(otherId, {
            otherId, username: '', display_name: null, avatar_url: null,
            lastBody: m.body, lastAt: m.created_at, unread: unreadInc,
          })
        } else {
          existing.unread += unreadInc
        }
      }

      const ids = [...byOther.keys()]
      if (ids.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', ids)
        for (const p of (profs as { id: string; username: string; display_name: string | null; avatar_url: string | null }[] | null) ?? []) {
          const c = byOther.get(p.id)
          if (c) { c.username = p.username; c.display_name = p.display_name; c.avatar_url = p.avatar_url }
        }
      }
      if (active) setConvos([...byOther.values()].filter((c) => c.username))
    })()
    return () => { active = false }
  }, [user])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8">
          <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// messages'}</span>
          <h1 className="mt-3 font-pixel text-xl">Messages</h1>
        </div>

        {convos === null ? (
          <p className="font-mono text-sm text-muted-foreground">Loading<span className="blink">_</span></p>
        ) : convos.length === 0 ? (
          <div className="flex flex-col items-center justify-center border-2 border-border bg-card py-20 text-center">
            <MessageSquare className="mb-4 h-10 w-10 text-muted-foreground/30" />
            <p className="font-pixel text-xs text-muted-foreground">No conversations yet</p>
            <p className="mt-3 font-mono text-sm text-muted-foreground">
              Message someone from their profile, or reply to interest on your posts.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {convos.map((c) => (
              <Link
                key={c.otherId}
                href={`/messages/${c.username}`}
                className="flex items-center gap-3 border-2 border-border bg-card p-4 transition-colors hover:border-primary"
              >
                <PixelAvatar username={c.username} avatarColor={colorFromId(c.otherId)} size={40} imageUrl={c.avatar_url ?? undefined} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-mono text-sm text-foreground">{c.display_name ?? c.username}</p>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{timeAgo(c.lastAt)}</span>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{c.lastBody}</p>
                </div>
                {c.unread > 0 && (
                  <span className="grid h-5 min-w-5 shrink-0 place-items-center border border-background bg-primary px-1 font-pixel text-[8px] text-primary-foreground">
                    {c.unread}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
