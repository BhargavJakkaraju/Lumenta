import type React from "react"
import type { Metadata } from "next"
import { Manrope, Inter, Space_Grotesk } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
})

// Replace Cal Sans with Space Grotesk (similar geometric sans-serif)
const calSans = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600"], // SemiBold weight to match CalSans-SemiBold
  variable: "--font-cal-sans",
  display: "swap",
})

// Replace Instrument Sans with Inter (similar humanist sans-serif)
const instrumentSans = Inter({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Apex - Enterprise SaaS Platform",
  description: "The modern platform for teams who ship fast. Built for scale, designed for speed.",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${manrope.variable} ${calSans.variable} ${instrumentSans.variable} font-sans antialiased`}>
        <div className="noise-overlay" aria-hidden="true" />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
