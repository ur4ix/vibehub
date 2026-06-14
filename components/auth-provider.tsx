'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
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

    async function loadProfile(supabaseUserId: string, email: string) {
      const { data: rawData } = await supabase
        .from('users')
        .select('username, display_name, avatar_url, reputation')
        .eq('id', supabaseUserId)
        .single()
      const data = rawData as { username: string; display_name: string | null; avatar_url: string | null; reputation: number } | null

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

    // Use getSession() for fast initial render (no network round-trip)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id, session.user.email ?? '').finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id, session.user.email ?? '')
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
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
