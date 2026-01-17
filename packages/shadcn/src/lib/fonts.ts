import { Edu_QLD_Beginner as EduQLDHand, Inter, Urbanist } from 'next/font/google'

export const eduQldHand = EduQLDHand({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-edu-qld-hand',
})

// Using Urbanist as a replacement for Momo Trust Display
// Urbanist is a modern geometric sans-serif that works well for display text
export const momoTrustDisplay = Urbanist({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-momo-trust-display',
})

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})
