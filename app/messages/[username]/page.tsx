'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Send, ArrowLeft } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PixelButton } from '@/components/pixel-button'
import { PixelAvatar, colorFromId } from '@/components/pixel-avatar'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/components/pixel-toast'
import { createClient } from '@/lib/supabase/client'
import { containsBanned, BANNED_MESSAGE } from '@/lib/banned-words'

interface Other {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}
interface Message {
  id: string
  sender_id: string
  recipient_id: string
  body: string
  created_at: string
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function ConversationPage() {
  const { username } = useParams<{ username: string }>()
  const router = useRouter()
  const { user, loading } = useAuth()
  const toast = useToast()

  const [other, setOther]       = useState<Other | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody]         = useState('')
  const [sending, setSending]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/auth')
  }, [loading, user, router])

  // Resolve the other participant.
  useEffect(() => {
    if (!username) return
    const supabase = createClient()
    let active = true
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('username', username)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        if (!data) setNotFound(true)
        else setOther(data as Other)
      })
    return () => { active = false }
  }, [username])

  const loadMessages = useCallback(async (me: string, them: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, body, created_at')
      .or(`and(sender_id.eq.${me},recipient_id.eq.${them}),and(sender_id.eq.${them},recipient_id.eq.${me})`)
      .order('created_at', { ascending: true })
      .limit(200)
    setMessages((data as Message[] | null) ?? [])
    // Mark their messages to me as read.
    await supabase.from('messages').update({ is_read: true }).eq('sender_id', them).eq('recipient_id', me).eq('is_read', false)
  }, [])

  // Load + poll while the conversation is open.
  useEffect(() => {
    if (!user || !other) return
    loadMessages(user.id, other.id)
    const interval = setInterval(() => loadMessages(user.id, other.id), 5000)
    return () => clearInterval(interval)
  }, [user, other, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !other || !body.trim() || sending) return
    if (containsBanned(body)) { toast.error('Not allowed', BANNED_MESSAGE); return }
    setSending(true)
    const supabase = createClient()
    const text = body.trim()
    const { data, error } = await supabase
      .from('messages')
      .insert({ sender_id: user.id, recipient_id: other.id, body: text })
      .select('id, sender_id, recipient_id, body, created_at')
      .single()
    setSending(false)
    if (error) { toast.error('Could not send', error.message); return }
    setMessages((prev) => [...prev, data as Message])
    setBody('')
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">
        <Link href="/messages" className="mb-6 inline-flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> All messages
        </Link>

        {notFound ? (
          <p className="font-mono text-sm text-muted-foreground">User not found.</p>
        ) : !other ? (
          <p className="font-mono text-sm text-muted-foreground">Loading<span className="blink">_</span></p>
        ) : (
          <div className="flex flex-1 flex-col border-2 border-border bg-card pixel-shadow-border">
            {/* Header */}
            <Link href={`/u/${other.username}`} className="group flex items-center gap-3 border-b-2 border-border p-4">
              <PixelAvatar username={other.username} avatarColor={colorFromId(other.id)} size={36} imageUrl={other.avatar_url ?? undefined} />
              <div className="min-w-0">
                <p className="truncate font-mono text-sm text-foreground group-hover:text-primary">{other.display_name ?? other.username}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">@{other.username}</p>
              </div>
            </Link>

            {/* Messages */}
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" style={{ maxHeight: '55vh' }}>
              {messages.length === 0 ? (
                <p className="m-auto font-mono text-xs text-muted-foreground">No messages yet — say hello.</p>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_id === user?.id
                  return (
                    <div key={m.id} className={'flex flex-col ' + (mine ? 'items-end' : 'items-start')}>
                      <div className={'max-w-[80%] border-2 px-3 py-2 ' + (mine ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-background text-foreground')}>
                        <p className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{m.body}</p>
                      </div>
                      <span className="mt-1 font-mono text-[9px] text-muted-foreground">{timeAgo(m.created_at)}</span>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <form onSubmit={send} className="flex items-end gap-2 border-t-2 border-border p-3">
              <textarea
                rows={1}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
                placeholder="Write a message…"
                className="flex-1 resize-none border-2 border-input bg-background px-3 py-2 font-mono text-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
              />
              <PixelButton type="submit" disabled={sending || !body.trim()} className="shrink-0 px-3 py-2.5">
                <Send className="h-3.5 w-3.5" />
              </PixelButton>
            </form>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
