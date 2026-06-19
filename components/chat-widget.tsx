'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { MessageSquare, X, ArrowLeft, Send } from 'lucide-react'
import { PixelAvatar, colorFromId } from '@/components/pixel-avatar'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/components/pixel-toast'
import { createClient } from '@/lib/supabase/client'
import { containsBanned, BANNED_MESSAGE } from '@/lib/banned-words'
import { OPEN_CHAT_EVENT } from '@/lib/chat-bus'

interface Row {
  id: string; sender_id: string; recipient_id: string; body: string; is_read: boolean; created_at: string
}
interface Convo {
  otherId: string; username: string; display_name: string | null; avatar_url: string | null
  lastBody: string; lastAt: string; unread: number
}
interface Other { id: string; username: string; display_name: string | null; avatar_url: string | null }

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (d < 60) return 'now'
  if (d < 3600) return `${Math.floor(d / 60)}m`
  if (d < 86400) return `${Math.floor(d / 3600)}h`
  return `${Math.floor(d / 86400)}d`
}

export function ChatWidget() {
  const { user } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [convos, setConvos] = useState<Convo[] | null>(null)
  const [other, setOther] = useState<Other | null>(null)   // active thread (null = list)
  const [messages, setMessages] = useState<Row[]>([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  // ── data loaders ────────────────────────────────────────────────────────────
  const loadUnread = useCallback(async () => {
    if (!user) return
    const supabase = createClient()
    const { count } = await supabase
      .from('messages').select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id).eq('is_read', false)
    setUnread(count ?? 0)
  }, [user])

  const loadConvos = useCallback(async () => {
    if (!user) return
    const supabase = createClient()
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, body, is_read, created_at')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(300)
    const rows = (data as Row[] | null) ?? []
    const map = new Map<string, Convo>()
    for (const m of rows) {
      const otherId = m.sender_id === user.id ? m.recipient_id : m.sender_id
      const inc = m.recipient_id === user.id && !m.is_read ? 1 : 0
      const ex = map.get(otherId)
      if (!ex) map.set(otherId, { otherId, username: '', display_name: null, avatar_url: null, lastBody: m.body, lastAt: m.created_at, unread: inc })
      else ex.unread += inc
    }
    const ids = [...map.keys()]
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', ids)
      for (const p of (profs as { id: string; username: string; display_name: string | null; avatar_url: string | null }[] | null) ?? []) {
        const c = map.get(p.id)
        if (c) { c.username = p.username; c.display_name = p.display_name; c.avatar_url = p.avatar_url }
      }
    }
    setConvos([...map.values()].filter((c) => c.username))
  }, [user])

  const loadThread = useCallback(async (otherId: string) => {
    if (!user) return
    const supabase = createClient()
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, body, is_read, created_at')
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .limit(200)
    setMessages((data as Row[] | null) ?? [])
    await supabase.from('messages').update({ is_read: true }).eq('sender_id', otherId).eq('recipient_id', user.id).eq('is_read', false)
    loadUnread()
  }, [user, loadUnread])

  const openThreadByUsername = useCallback(async (username: string) => {
    if (!user) return
    const supabase = createClient()
    const { data } = await supabase.from('profiles').select('id, username, display_name, avatar_url').eq('username', username).maybeSingle()
    if (!data) return
    const o = data as Other
    if (o.id === user.id) return
    setOther(o)
    loadThread(o.id)
  }, [user, loadThread])

  // ── open-chat event + unread on mount + realtime ─────────────────────────────
  useEffect(() => {
    if (!user) return
    loadUnread()
    function onOpen(e: Event) {
      const username = (e as CustomEvent).detail?.username as string | undefined
      setOpen(true)
      if (username) openThreadByUsername(username)
      else { setOther(null); loadConvos() }
    }
    window.addEventListener(OPEN_CHAT_EVENT, onOpen)

    const supabase = createClient()
    const channel = supabase
      .channel(`chat-widget:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` }, () => {
        loadUnread()
        setOther((cur) => { if (cur) loadThread(cur.id); return cur })
        setConvos((cur) => { if (cur !== null) loadConvos(); return cur })
      })
      .subscribe()
    const interval = setInterval(loadUnread, 30000)

    return () => { window.removeEventListener(OPEN_CHAT_EVENT, onOpen); supabase.removeChannel(channel); clearInterval(interval) }
  }, [user, loadUnread, loadConvos, loadThread, openThreadByUsername])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && !other) loadConvos()
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !other || !body.trim() || sending) return
    if (containsBanned(body)) { toast.error('Not allowed', BANNED_MESSAGE); return }
    setSending(true)
    const supabase = createClient()
    const text = body.trim()
    const { data, error } = await supabase
      .from('messages').insert({ sender_id: user.id, recipient_id: other.id, body: text })
      .select('id, sender_id, recipient_id, body, is_read, created_at').single()
    setSending(false)
    if (error) { toast.error('Could not send', error.message); return }
    setMessages((prev) => [...prev, data as Row])
    setBody('')
  }

  if (!user) return null

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={toggle}
          aria-label="Open chat"
          className="fixed bottom-4 right-4 z-50 grid h-14 w-14 place-items-center border-2 border-primary bg-primary text-primary-foreground pixel-shadow-border transition-transform hover:-translate-y-0.5"
        >
          <MessageSquare className="h-6 w-6" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center border-2 border-background bg-destructive px-1 font-pixel text-[8px] text-white">
              {unread}
            </span>
          )}
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="animate-modal fixed bottom-4 right-4 z-50 flex h-[70vh] max-h-[560px] w-[min(92vw,380px)] flex-col border-2 border-border bg-card pixel-shadow-border">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b-2 border-border px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              {other ? (
                <>
                  <button onClick={() => { setOther(null); loadConvos() }} aria-label="Back" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Link href={`/u/${other.username}`} className="group flex min-w-0 items-center gap-2">
                    <PixelAvatar username={other.username} avatarColor={colorFromId(other.id)} size={26} imageUrl={other.avatar_url ?? undefined} />
                    <span className="truncate font-mono text-xs text-foreground group-hover:text-primary">{other.display_name ?? other.username}</span>
                  </Link>
                </>
              ) : (
                <span className="font-pixel text-[10px] uppercase tracking-wider">Messages</span>
              )}
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          {other ? (
            <>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
                {messages.length === 0 ? (
                  <p className="m-auto font-mono text-xs text-muted-foreground">No messages yet — say hello.</p>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_id === user.id
                    return (
                      <div key={m.id} className={'flex flex-col ' + (mine ? 'items-end' : 'items-start')}>
                        <div className={'max-w-[85%] border-2 px-2.5 py-1.5 ' + (mine ? 'border-primary bg-primary/10' : 'border-border bg-background')}>
                          <p className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground">{m.body}</p>
                        </div>
                        <span className="mt-0.5 font-mono text-[9px] text-muted-foreground">{timeAgo(m.created_at)}</span>
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={send} className="flex items-end gap-2 border-t-2 border-border p-2">
                <textarea
                  rows={1}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
                  placeholder="Write a message…"
                  className="flex-1 resize-none border-2 border-input bg-background px-2.5 py-1.5 font-mono text-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
                />
                <button type="submit" disabled={sending || !body.trim()} className="grid h-8 w-8 shrink-0 place-items-center border-2 border-primary bg-primary text-primary-foreground disabled:opacity-50">
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {convos === null ? (
                <p className="p-6 text-center font-mono text-xs text-muted-foreground">Loading<span className="blink">_</span></p>
              ) : convos.length === 0 ? (
                <div className="grid h-full place-items-center p-6 text-center">
                  <div>
                    <MessageSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
                    <p className="font-mono text-xs text-muted-foreground">No conversations yet.</p>
                    <p className="mt-2 font-mono text-[10px] text-muted-foreground/70">Message someone from their profile.</p>
                  </div>
                </div>
              ) : (
                <ul>
                  {convos.map((c) => (
                    <li key={c.otherId}>
                      <button
                        onClick={() => { const o: Other = { id: c.otherId, username: c.username, display_name: c.display_name, avatar_url: c.avatar_url }; setOther(o); loadThread(o.id) }}
                        className="flex w-full items-center gap-3 border-b border-border px-3 py-3 text-left transition-colors hover:bg-secondary"
                      >
                        <PixelAvatar username={c.username} avatarColor={colorFromId(c.otherId)} size={34} imageUrl={c.avatar_url ?? undefined} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-mono text-xs text-foreground">{c.display_name ?? c.username}</span>
                            <span className="shrink-0 font-mono text-[9px] text-muted-foreground">{timeAgo(c.lastAt)}</span>
                          </div>
                          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{c.lastBody}</p>
                        </div>
                        {c.unread > 0 && (
                          <span className="grid h-4 min-w-4 shrink-0 place-items-center border border-background bg-primary px-1 font-pixel text-[8px] text-primary-foreground">{c.unread}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
