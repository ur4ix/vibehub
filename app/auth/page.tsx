import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthCard } from '@/components/auth-card'

export const metadata = {
  title: 'Sign in — Vydex',
}

export default async function AuthPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (data?.claims) redirect('/dashboard')

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div className="pixel-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="relative z-10 flex w-full justify-center">
        <Suspense>
          <AuthCard />
        </Suspense>
      </div>
    </main>
  )
}
