import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { AdminNav } from '@/components/admin-nav'

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Gates every /admin/* route server-side.
  await requireAdmin()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8">
          <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// admin'}</span>
          <h1 className="mt-3 font-pixel text-xl">Control panel</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Manage users, roles and platform activity.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
          <AdminNav />
          <div className="min-w-0">{children}</div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
