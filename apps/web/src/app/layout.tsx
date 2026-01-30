import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Agelum - AI Document Manager',
  description: 'Manage AI documents inside development projects',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
