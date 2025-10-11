"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <Card className="relative z-[10000] w-full max-w-md">
        <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>

        <CardHeader>
          <CardTitle className="text-2xl">Sign in required</CardTitle>
          <CardDescription>
            You need to be signed in to generate images. Create an account or sign in to continue.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link href="/auth/login">Sign In</Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="w-full bg-transparent">
            <Link href="/auth/sign-up">Create Account</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
