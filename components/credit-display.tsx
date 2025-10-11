"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DiamondIcon } from "@/components/ui/diamond-icon"
import { createClient } from "@/lib/supabase/client"

interface CreditInfo {
  credits: number
  membershipTier: string
}

export function CreditDisplay() {
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const fetchCredits = async () => {
    try {
      console.log("[v0] Fetching credits from API")
      const response = await fetch("/api/user/credits")
      console.log("[v0] Credits API response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Credits data:", data)
        setCreditInfo(data)
      } else {
        const errorText = await response.text()
        console.error("[v0] Credits API error:", response.status, errorText)
      }
    } catch (error) {
      console.error("[v0] Error fetching credits:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Check if user is authenticated first
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      console.log("[v0] Credit display - checking auth:", {
        hasUser: !!user,
        userId: user?.id,
        email: user?.email,
      })

      if (user) {
        setIsAuthenticated(true)
        await fetchCredits()
      } else {
        setIsAuthenticated(false)
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for credit updates
    const handleCreditUpdate = () => fetchCredits()
    window.addEventListener("creditsUpdated", handleCreditUpdate)

    // Listen for auth state changes
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[v0] Auth state changed:", event, !!session)
      if (event === "SIGNED_IN" && session) {
        setIsAuthenticated(true)
        fetchCredits()
      } else if (event === "SIGNED_OUT") {
        setIsAuthenticated(false)
        setCreditInfo(null)
      }
    })

    return () => {
      window.removeEventListener("creditsUpdated", handleCreditUpdate)
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    console.log("[v0] Credit display loading...")
    return null
  }

  if (!isAuthenticated) {
    console.log("[v0] Credit display - user not authenticated")
    return null
  }

  if (!creditInfo) {
    console.log("[v0] Credit display - no credit info")
    return null
  }

  console.log("[v0] Rendering credit display:", creditInfo)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <DiamondIcon className="h-3.5 w-3.5 text-pink-500" />
          <span className="font-semibold">{creditInfo.credits.toLocaleString()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Diamond Balance</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{creditInfo.credits.toLocaleString()}</span>
                <DiamondIcon className="h-5 w-5 text-pink-500" />
              </div>
              <span className="text-sm text-muted-foreground capitalize">{creditInfo.membershipTier} tier</span>
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="text-sm font-medium">Diamond Costs</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Image Generation</span>
                <span className="font-medium flex items-center gap-1">
                  500 <DiamondIcon className="h-3 w-3 text-pink-500" />
                </span>
              </div>
              <div className="flex justify-between">
                <span>Image Edit</span>
                <span className="font-medium flex items-center gap-1">
                  1,000 <DiamondIcon className="h-3 w-3 text-pink-500" />
                </span>
              </div>
              <div className="flex justify-between">
                <span>Video (3s)</span>
                <span className="font-medium flex items-center gap-1">
                  2,000 <DiamondIcon className="h-3 w-3 text-pink-500" />
                </span>
              </div>
              <div className="flex justify-between">
                <span>Video (5s)</span>
                <span className="font-medium flex items-center gap-1">
                  3,000 <DiamondIcon className="h-3 w-3 text-pink-500" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
