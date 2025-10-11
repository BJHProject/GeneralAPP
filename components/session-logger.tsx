"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export function SessionLogger() {
  useEffect(() => {
    const supabase = createClient()

    const logSession = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          await fetch("/api/log-session", {
            method: "POST",
          }).catch(() => {
            // Silently fail if logging fails
          })
        }
      } catch (error) {
        // Silently handle auth errors to prevent breaking the app
        console.error("Session logging error:", error)
      }
    }

    // Initial session log
    logSession()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        logSession()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}
