import { NextResponse } from "next/server"
import { ensureUserExists } from "@/lib/credits"
import { auth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    console.log("[v0] Fetching saved edited images from database")

    const session = await auth()

    console.log("[v0] User authenticated:", session?.user ? session.user.id : "No user")

    if (!session?.user) {
      console.log("[v0] No user found, returning empty array")
      return NextResponse.json({ images: [] })
    }

    const user = session.user

    try {
      await ensureUserExists(user.id, user.email || "", user.name, user.image)
      console.log("[v0] User record ensured in database")
    } catch (error) {
      console.error("[v0] Failed to ensure user exists:", error)
    }

    const supabase = await createClient()

    const { data: savedImages, error: savedError } = await supabase
      .from("edited_images")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_saved", true)
      .order("created_at", { ascending: false })

    if (savedError) {
      console.error("[v0] Database error fetching saved edited images:", savedError)
      return NextResponse.json({ images: [] })
    }

    console.log("[v0] Found saved edited images:", savedImages?.length || 0)
    return NextResponse.json({ images: savedImages || [] })
  } catch (error) {
    console.error("[v0] Failed to fetch saved edited images:", error)
    return NextResponse.json({ images: [] })
  }
}
