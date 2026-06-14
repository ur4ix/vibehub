import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { ListingDetail } from '@/components/listing-detail'

export const metadata = {
  title: 'ai-chat-starter — VibeHub',
}

export default function ListingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <ListingDetail />
      </main>
      <SiteFooter />
    </div>
  )
}
