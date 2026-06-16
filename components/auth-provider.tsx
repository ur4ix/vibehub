'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { colorFromId } from '@/components/pixel-avatar'

export interface CurrentUser {
  id: string
  email: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  avatarColor: string
  reputation: number
}

interface AuthContextValue {
  user: CurrentUser | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let loadedUserId: string | null = null
    let active = true

    async function loadProfile(supabaseUserId: string, email: string) {
      const { data: rawData } = await supabase
        .from('users')
        .select('username, display_name, avatar_url, reputation')
        .eq('id', supabaseUserId)
        .single()
      const data = rawData as { username: string; display_name: string | null; avatar_url: string | null; reputation: number } | null
      if (!active) return

      setUser({
        id: supabaseUserId,
        email,
        username: data?.username ?? email.split('@')[0] ?? 'user',
        displayName: data?.display_name ?? null,
        avatarUrl: data?.avatar_url ?? null,
        avatarColor: colorFromId(supabaseUserId),
        reputation: data?.reputation ?? 0,
      })
    }

    // Single path for both the authoritative initial read and later auth events.
    // Deduped by user id so token refreshes for the same user don't refetch.
    async function apply(session: Session | null) {
      const sessionUser = session?.user ?? null

      if (!sessionUser) {
        loadedUserId = null
        if (active) { setUser(null); setLoading(false) }
        return
      }

      if (sessionUser.id === loadedUserId) {
        if (active) setLoading(false)
        return
      }

      loadedUserId = sessionUser.id
      await loadProfile(sessionUser.id, sessionUser.email ?? '')
      if (active) setLoading(false)
    }

    // Authoritative initial read — covers a transient null INITIAL_SESSION event
    // (which was briefly flipping `user` to null and bouncing protected pages).
    supabase.auth.getSession().then(({ data: { session } }) => apply(session))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => apply(session))

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.push('/')
    router.refresh()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
