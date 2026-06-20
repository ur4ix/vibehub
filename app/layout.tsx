import type { Metadata, Viewport } from 'next'
import { Geist_Mono, Press_Start_2P } from 'next/font/google'
import { AuthProvider } from '@/components/auth-provider'
import { ToastProvider } from '@/components/pixel-toast'
import { PageTransition } from '@/components/page-transition'
import { ScrollReveal } from '@/components/scroll-reveal'
import { ChatWidget } from '@/components/chat-widget'
import { SITE_URL, SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION, TWITTER_HANDLE } from '@/lib/site'
import './globals.css'

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const pressStart = Press_Start_2P({
  variable: '--font-press-start',
  weight: '400',
  subsets: ['latin'],
})

const TITLE_DEFAULT = `${SITE_NAME} — ${SITE_TAGLINE}`

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE_DEFAULT,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    creator: TWITTER_HANDLE,
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`dark ${pressStart.variable} ${geistMono.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        <AuthProvider>
          <ToastProvider>
            <PageTransition>{children}</PageTransition>
            <ScrollReveal />
            <ChatWidget />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
