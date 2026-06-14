import type { Metadata } from 'next'
import { ContactPageClient } from './contact-client'

export const metadata: Metadata = {
  title: 'Contact — VibeHub',
  description: 'Get in touch with the VibeHub team.',
}

export default function ContactPage() {
  return <ContactPageClient />
}
