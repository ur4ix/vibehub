import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { NewsletterForm } from './newsletter-form'

export const metadata: Metadata = {
  title: 'Blog — Vydex',
  description: 'Thoughts on vibe coding, marketplace updates and builder stories.',
}

const POSTS = [
  {
    slug: 'what-is-vibe-coding',
    category: 'Guide',
    categoryIcon: '☰',
    title: 'What is vibe coding — and why it works',
    excerpt:
      'Vibe coding is the practice of building software by iterating rapidly with AI tools, trusting intuition over architecture docs. Here&apos;s why it produces surprisingly good results.',
    author: 'neon_dev',
    date: 'Jun 10, 2026',
    readTime: '5 min',
  },
  {
    slug: 'how-to-price-your-repo',
    category: 'Business',
    categoryIcon: '▦',
    title: 'How to price your repository on Vydex',
    excerpt:
      "Pricing digital products is hard. We analyzed 800+ listings to find what actually sells. Spoiler: it's not what you think.",
    author: 'pixel_kate',
    date: 'Jun 7, 2026',
    readTime: '7 min',
  },
  {
    slug: 'building-ai-starter-kit',
    category: 'Tutorial',
    categoryIcon: '▢',
    title: 'Building a production-ready AI starter kit in 4 hours',
    excerpt:
      'A step-by-step breakdown of how @bytesmith built and published the most-forked repository on Vydex — from zero to listing in one session.',
    author: 'bytesmith',
    date: 'Jun 3, 2026',
    readTime: '12 min',
  },
  {
    slug: 'community-review-system',
    category: 'Product',
    categoryIcon: '◧',
    title: "How Vydex's community review system works",
    excerpt:
      "We don't use editors or AI to gatekeep quality. Here's how the community-driven review pipeline keeps junk out without slowing good work down.",
    author: 'neon_dev',
    date: 'May 28, 2026',
    readTime: '4 min',
  },
  {
    slug: 'prompt-economy',
    category: 'Trends',
    categoryIcon: '☰',
    title: 'The prompt economy: $1M in prompt sales and counting',
    excerpt:
      'Prompts are the new APIs. We look at the creators who are making serious money selling carefully crafted system prompts and agent chains.',
    author: 'pixel_kate',
    date: 'May 20, 2026',
    readTime: '6 min',
  },
  {
    slug: 'open-source-vs-paid',
    category: 'Opinion',
    categoryIcon: '▢',
    title: 'Open source vs. paid: how to decide',
    excerpt:
      "There's no universal answer. But there's a clear framework. We interviewed 40 Vydex sellers to find out how they think about it.",
    author: 'bytesmith',
    date: 'May 14, 2026',
    readTime: '8 min',
  },
]

const FEATURED = POSTS[0]
const REST = POSTS.slice(1)

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {/* Heading */}
        <div className="mb-12">
          <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">// blog</span>
          <h1 className="mt-5 font-pixel text-2xl leading-[1.4]">The Vydex blog</h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Guides, stories, and updates from the team and community.
          </p>
        </div>

        {/* Featured post */}
        <Link
          href={`/blog/${FEATURED.slug}`}
          className="group mb-10 block border-2 border-border bg-card p-8 transition-all duration-100 hover:border-primary pixel-shadow-border"
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="border-2 border-primary bg-primary/10 px-3 py-1 font-pixel text-[9px] text-primary">
              {FEATURED.categoryIcon} {FEATURED.category}
            </span>
            <span className="font-mono text-xs text-muted-foreground">Featured</span>
          </div>
          <h2 className="text-balance font-pixel text-xl leading-[1.5] group-hover:text-primary">
            {FEATURED.title}
          </h2>
          <p className="mt-4 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            {FEATURED.excerpt}
          </p>
          <div className="mt-6 flex items-center gap-4 font-mono text-xs text-muted-foreground">
            <span>@{FEATURED.author}</span>
            <span>·</span>
            <span>{FEATURED.date}</span>
            <span>·</span>
            <span>{FEATURED.readTime} read</span>
          </div>
        </Link>

        {/* Post grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {REST.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col border-2 border-border bg-card p-6 transition-all duration-100 hover:border-primary pixel-shadow-border"
            >
              <span className="self-start border border-border bg-secondary px-2 py-1 font-pixel text-[9px] text-muted-foreground">
                {post.categoryIcon} {post.category}
              </span>
              <h3 className="mt-4 text-balance font-pixel text-xs leading-[1.6] group-hover:text-primary">
                {post.title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                {post.excerpt}
              </p>
              <div className="mt-5 flex items-center gap-3 border-t border-border pt-4 font-mono text-[10px] text-muted-foreground">
                <span>@{post.author}</span>
                <span className="ml-auto">{post.readTime} read</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Newsletter CTA */}
        <NewsletterForm />
      </main>

      <SiteFooter />
    </div>
  )
}
