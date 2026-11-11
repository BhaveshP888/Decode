import type { Metadata } from 'next'
import { Outfit, Inter } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Decode — Know What You Consume',
  description: 'AI-powered ingredient analysis for packaged foods and medicines. Understand what goes into your body.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable} dark`}>
      <body className="font-sans antialiased bg-[#0b0c0e] text-zinc-100 selection:bg-emerald-500/20 selection:text-emerald-300 min-h-screen">
        {children}
      </body>
    </html>
  )
}

