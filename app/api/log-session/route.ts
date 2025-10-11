import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userAgent = request.headers.get("user-agent") || "Unknown"
    const forwardedFor = request.headers.get("x-forwarded-for")
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0] : "Unknown"

    const { error: insertError } = await supabase.from("user_sessions").insert({
      user_id: user.id,
      email: user.email || "",
      provider: user.app_metadata?.provider || "unknown",
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    if (insertError) {
      return NextResponse.json({ error: "Failed to log session" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
