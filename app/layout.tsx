import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { SessionLogger } from "@/components/session-logger"
import { Footer } from "@/components/footer"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
      <body className="flex flex-col min-h-screen">
        <Suspense fallback={<div>Loading...</div>}>
          <SessionLogger />
          <div className="flex-1">{children}</div>
          <Footer />
          <Analytics />
        </Suspense>
      </body>
    </html>
  )
}
