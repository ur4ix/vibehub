import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { Catalog } from '@/components/catalog'
import { HowItWorks } from '@/components/how-it-works'
import { CtaSection } from '@/components/cta-section'
import { SiteFooter } from '@/components/site-footer'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <Catalog />
        <HowItWorks />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  )
}
