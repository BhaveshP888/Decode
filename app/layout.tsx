import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
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
    <html lang="en" className={outfit.variable}>
      <body className="font-sans antialiased bg-zinc-950 text-zinc-50">
        {children}
      </body>
    </html>
  )
}
