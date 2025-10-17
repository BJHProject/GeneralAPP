import { NextResponse } from "next/server"
import { ensureUserExists } from "@/lib/credits"
import { auth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    console.log("[v0] Fetching images from database")

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
      // Continue anyway to try fetching images
    }

    const supabase = await createClient()

    // Fetch last 20 UNSAVED images only for Recent Generations
    const { data: recentImages, error: recentError } = await supabase
      .from("images")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_saved", false)
      .order("created_at", { ascending: false })
      .limit(20)

    if (recentError) {
      console.error("[v0] Database error fetching recent images:", recentError)
      return NextResponse.json({ images: [] })
    }

    console.log("[v0] Found recent unsaved images:", recentImages?.length || 0)
    return NextResponse.json({ images: recentImages || [] })
  } catch (error) {
    console.error("[v0] Failed to fetch images:", error)
    return NextResponse.json({ images: [] })
  }
}
