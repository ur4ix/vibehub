import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { BuiltWith } from '@/components/built-with'
import { Catalog } from '@/components/catalog'
import { HowItWorks } from '@/components/how-it-works'
import { ForSellers } from '@/components/for-sellers'
import { CtaSection } from '@/components/cta-section'
import { SiteFooter } from '@/components/site-footer'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <BuiltWith />
        <Catalog />
        <HowItWorks />
        <ForSellers />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  )
}
