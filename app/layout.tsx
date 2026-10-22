import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Suspense } from 'react'

import { AuthModal } from '@/components/auth/auth-modal'
import { BottomNav } from '@/components/layout/bottom-nav'
import { Footer } from '@/components/layout/footer'
import { TopBar } from '@/components/layout/top-bar'
import { SessionProvider } from '@/components/providers/session-provider'
import { Toaster } from '@/components/ui/sonner'

import './globals.css'

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'ClimaxGame · Tu red gamer en español',
    template: '%s · ClimaxGame',
  },
  description:
    'Descubre lanzamientos, guarda tus juegos favoritos, opina y sigue a jugadores de Latinoamérica con tus mismos gustos.',
  openGraph: { siteName: 'ClimaxGame', locale: 'es_419', type: 'website' },
}

export const viewport: Viewport = {
  themeColor: '#0f0f12',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Tema oscuro por defecto: la convención en sitios de videojuegos.
    <html lang="es" className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SessionProvider>
          <TopBar />
          <main className="flex-1">{children}</main>
          <Footer />
          <BottomNav />
          <Suspense fallback={null}>
            <AuthModal />
          </Suspense>
          <Toaster theme="dark" position="top-center" richColors />
        </SessionProvider>
      </body>
    </html>
  )
}
