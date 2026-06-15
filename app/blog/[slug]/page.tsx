import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Markdown } from '@/components/markdown'
import { createClient } from '@/lib/supabase/server'
import type { BlogPost } from '@/types/database'

interface PageProps {
  params: Promise<{ slug: string }>
}

function readingTime(body: string) {
  const words = body.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

async function getPost(slug: string): Promise<BlogPost | null> {
  const supabase = await createClient()
  // RLS lets anon read published posts; authors/admins also see their drafts.
  const { data } = await supabase
    .from('posts')
    .select('*, author:author_id(username, display_name, avatar_url)')
    .eq('slug', slug)
    .maybeSingle()
  return data as BlogPost | null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Post not found — Vydex' }
  return {
    title: `${post.title} — Vydex Blog`,
    description: post.excerpt ?? undefined,
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const authorName = post.author?.display_name ?? post.author?.username ?? 'Vydex'

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 font-mono text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary">~</Link>
          {' / '}
          <Link href="/blog" className="hover:text-primary">blog</Link>
          {' / '}
          <span className="text-foreground">{slug}</span>
        </nav>

        {post.status !== 'published' && (
          <p className="mb-6 inline-block border border-border px-2 py-1 font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">
            Draft preview
          </p>
        )}

        {post.category && (
          <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">{`// ${post.category}`}</span>
        )}

        <h1 className="mt-4 text-balance font-pixel text-2xl leading-[1.4]">{post.title}</h1>

        <div className="mt-5 flex flex-wrap items-center gap-3 font-mono text-xs text-muted-foreground">
          <span>@{post.author?.username ?? 'vydex'}</span>
          <span>·</span>
          <span>{formatDate(post.published_at ?? post.created_at)}</span>
          <span>·</span>
          <span>{readingTime(post.body)} min read</span>
        </div>

        {post.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_url}
            alt={post.title}
            className="mt-8 w-full border-2 border-border"
          />
        )}

        {post.excerpt && (
          <p className="mt-8 border-l-2 border-primary pl-4 text-base leading-relaxed text-foreground">
            {post.excerpt}
          </p>
        )}

        <article className="mt-8">
          <Markdown>{post.body}</Markdown>
        </article>

        <div className="mt-14 flex items-center justify-between border-t-2 border-border pt-6 font-mono text-xs">
          <Link href="/blog" className="text-primary hover:underline">← All posts</Link>
          <span className="text-muted-foreground">By {authorName}</span>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
