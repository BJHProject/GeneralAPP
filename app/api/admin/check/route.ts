import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ isAdmin: false }, { status: 401 })
    }

    // Check if user is admin
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("is_admin")
      .eq("user_id", user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ isAdmin: false }, { status: 403 })
    }

    return NextResponse.json({ isAdmin: session.is_admin || false })
  } catch (error) {
    console.error("[v0] Admin check error:", error)
    return NextResponse.json({ isAdmin: false }, { status: 500 })
  }
}
