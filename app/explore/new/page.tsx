import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { UploadForm } from '@/components/upload-form'

export const metadata: Metadata = {
  title: 'Publish repository',
}

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const editing = Boolean((await searchParams).edit)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <nav className="mb-8 font-mono text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">~</Link>
          {' / '}
          <Link href="/explore" className="hover:text-primary">explore</Link>
          {' / '}
          <span className="text-foreground">new</span>
        </nav>

        <div className="mb-8">
          <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">
            {editing ? '// edit repository' : '// new repository'}
          </span>
          <h1 className="mt-3 font-pixel text-lg">{editing ? 'Edit repository' : 'Publish repository'}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {editing
              ? 'Update the details, or upload a new version with a changelog — older versions stay in the history.'
              : 'Publish your code as free or paid — the community can buy, fork and review it.'}
          </p>
        </div>

        <UploadForm userId={user.id} />
      </main>

      <SiteFooter />
    </div>
  )
}
