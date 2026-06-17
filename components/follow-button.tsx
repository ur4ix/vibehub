'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/pixel-toast'

export function FollowButton({
  targetUserId,
  currentUserId,
  initialFollowing,
}: {
  targetUserId: string
  currentUserId: string | null
  initialFollowing: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const [following, setFollowing] = useState(initialFollowing)
  const [busy, setBusy] = useState(false)

  // Don't show a follow button on your own profile.
  if (currentUserId === targetUserId) return null

  async function toggle() {
    if (!currentUserId) { router.push('/auth'); return }
    if (busy) return
    setBusy(true)
    const supabase = createClient()
    const next = !following
    setFollowing(next) // optimistic

    const { error } = next
      ? await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetUserId })
      : await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', targetUserId)

    if (error) {
      setFollowing(!next)
      toast.error('Could not update', error.message)
    } else {
      router.refresh() // refresh the server-rendered follower count
    }
    setBusy(false)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={
        'mt-5 inline-flex w-full items-center justify-center gap-1.5 border-2 px-4 py-2.5 font-pixel text-[10px] uppercase leading-none tracking-wider transition-all duration-100 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-60 ' +
        (following
          ? 'border-border bg-card text-muted-foreground hover:border-destructive hover:text-destructive'
          : 'border-primary bg-primary text-primary-foreground pixel-shadow-border hover:brightness-110 hover:-translate-x-0.5 hover:-translate-y-0.5')
      }
    >
      {following ? (
        <><UserCheck className="h-3.5 w-3.5" />Following</>
      ) : (
        <><UserPlus className="h-3.5 w-3.5" />Follow</>
      )}
    </button>
  )
}
