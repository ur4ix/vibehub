import type { Metadata, Viewport } from 'next'
import { Geist_Mono, Press_Start_2P } from 'next/font/google'
import { AuthProvider } from '@/components/auth-provider'
import { ToastProvider } from '@/components/pixel-toast'
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

export const metadata: Metadata = {
  title: 'VibeHub — marketplace for vibe coders',
  description:
    'Buy and sell apps, components, prompts and templates. Everything you built on vibes — now earns money.',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0a0f',
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
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
