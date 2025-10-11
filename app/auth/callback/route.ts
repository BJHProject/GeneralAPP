import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  console.log("[v0] ===== Auth callback started =====")

  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")
  const next = searchParams.get("next") ?? "/"

  console.log("[v0] Callback params:", {
    hasCode: !!code,
    error,
    errorDescription,
    next,
    origin,
  })

  // If Google returned an error
  if (error) {
    console.log("[v0] OAuth error from Google:", error, errorDescription)
    return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(errorDescription || error)}`)
  }

  if (code) {
    console.log("[v0] Exchanging code for session...")
    const supabase = await createClient()
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    console.log("[v0] Exchange result:", {
      success: !exchangeError,
      hasSession: !!data?.session,
      hasUser: !!data?.user,
      userId: data?.user?.id,
      email: data?.user?.email,
      error: exchangeError?.message,
    })

    if (!exchangeError && data?.session && data?.user) {
      // The database trigger automatically creates user records and grants 3000 credits
      console.log("[v0] ✓ User authenticated:", data.user.email)
      console.log("[v0] User creation and credit bonus handled by database trigger")

      console.log("[v0] Login successful, redirecting to:", next)
      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } else {
      console.log("[v0] ✗ Exchange failed:", exchangeError?.message)
    }
  } else {
    console.log("[v0] ✗ No code provided in callback")
  }

  console.log("[v0] ===== Auth callback failed, redirecting to error =====")
  return NextResponse.redirect(`${origin}/auth/error`)
}
