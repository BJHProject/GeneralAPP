"use client"

import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t bg-background mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <Link 
              href="/terms" 
              className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Terms of Service
            </Link>
            <Link 
              href="/acceptable-use" 
              className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Acceptable Use Policy
            </Link>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} AI Generation App. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
