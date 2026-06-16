import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { NewsletterForm } from './newsletter-form'
import { createClient } from '@/lib/supabase/server'
import type { BlogPost } from '@/types/database'

export const metadata: Metadata = {
  title: 'Blog — Vydex',
  description: 'Thoughts on vibe coding, marketplace updates and builder stories.',
}

function readingTime(body: string) {
  const words = body.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

async function getData() {
  const supabase = await createClient()

  const { data: postsRaw } = await supabase
    .from('posts')
    .select('id, slug, title, excerpt, body, cover_url, category, status, published_at, created_at, author:author_id(username, display_name, avatar_url)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50)

  const posts = (postsRaw as BlogPost[] | null) ?? []

  // Can the current user author posts? (drives the Write button only — RLS is
  // the real gate.)
  let canWrite = false
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
    canWrite = Boolean(roles?.length)
  }

  return { posts, canWrite }
}

export default async function BlogPage() {
  const { posts, canWrite } = await getData()
  const featured = posts[0] ?? null
  const rest = posts.slice(1)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-14 sm:px-6">
        {/* Heading */}
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{'// blog'}</span>
            <h1 className="mt-5 font-pixel text-2xl leading-[1.4]">The Vydex blog</h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Guides, stories, and updates from the team and community.
            </p>
          </div>
          {canWrite && (
            <Link
              href="/blog/new"
              className="font-pixel inline-flex items-center justify-center border-2 px-5 py-3 text-[10px] uppercase leading-none tracking-wider border-primary bg-primary text-primary-foreground pixel-shadow-border transition-all duration-100 hover:brightness-110 active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              + Write post
            </Link>
          )}
        </div>

        {posts.length === 0 ? (
          <div className="border-2 border-dashed border-border p-16 text-center">
            <p className="font-mono text-sm text-muted-foreground">
              No posts yet.{canWrite ? ' Write the first one.' : ' Check back soon.'}
            </p>
          </div>
        ) : (
          <>
            {/* Featured post */}
            {featured && (
              <Link
                href={`/blog/${featured.slug}`}
                className="group mb-10 block border-2 border-border bg-card p-8 transition-all duration-100 hover:border-primary pixel-shadow-border"
              >
                <div className="mb-5 flex items-center gap-3">
                  {featured.category && (
                    <span className="border-2 border-primary bg-primary/10 px-3 py-1 font-pixel text-[9px] text-primary">
                      {featured.category}
                    </span>
                  )}
                  <span className="font-mono text-xs text-muted-foreground">Featured</span>
                </div>
                <h2 className="text-balance font-pixel text-xl leading-[1.5] group-hover:text-primary">
                  {featured.title}
                </h2>
                {featured.excerpt && (
                  <p className="mt-4 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
                    {featured.excerpt}
                  </p>
                )}
                <div className="mt-6 flex items-center gap-4 font-mono text-xs text-muted-foreground">
                  <span>@{featured.author?.username ?? 'vydex'}</span>
                  <span>·</span>
                  <span>{formatDate(featured.published_at ?? featured.created_at)}</span>
                  <span>·</span>
                  <span>{readingTime(featured.body)} min read</span>
                </div>
              </Link>
            )}

            {/* Post grid */}
            {rest.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group flex flex-col border-2 border-border bg-card p-6 transition-all duration-100 hover:border-primary pixel-shadow-border"
                  >
                    {post.category && (
                      <span className="self-start border border-border bg-secondary px-2 py-1 font-pixel text-[9px] text-muted-foreground">
                        {post.category}
                      </span>
                    )}
                    <h3 className="mt-4 text-balance font-pixel text-xs leading-[1.6] group-hover:text-primary">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="mt-5 flex items-center gap-3 border-t border-border pt-4 font-mono text-[10px] text-muted-foreground">
                      <span>@{post.author?.username ?? 'vydex'}</span>
                      <span className="ml-auto">{readingTime(post.body)} min read</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Newsletter CTA */}
        <NewsletterForm />
      </main>

      <SiteFooter />
    </div>
  )
}
