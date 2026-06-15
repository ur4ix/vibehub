import type { Metadata } from 'next'
import { ContactPageClient } from './contact-client'

export const metadata: Metadata = {
  title: 'Contact — Vydex',
  description: 'Get in touch with the Vydex team.',
}

export default function ContactPage() {
  return <ContactPageClient />
}
