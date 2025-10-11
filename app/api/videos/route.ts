import { createServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] No user authenticated for videos")
      return Response.json({ videos: [] })
    }

    console.log("[v0] Fetching videos for user:", user.id)

    const { data: savedVideos, error: savedError } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_saved", true)
      .order("created_at", { ascending: false })

    const { data: recentVideos, error: recentError } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_saved", false)
      .order("created_at", { ascending: false })
      .limit(10)

    if (savedError) {
      console.error("[v0] Error fetching saved videos:", savedError)
      throw savedError
    }

    if (recentError) {
      console.error("[v0] Error fetching recent videos:", recentError)
      throw recentError
    }

    const allVideos = [...(savedVideos || []), ...(recentVideos || [])]
    console.log("[v0] Found videos:", allVideos.length)

    return Response.json({ videos: allVideos })
  } catch (error) {
    console.error("[v0] Error in videos API:", error)
    return Response.json({ error: "Failed to fetch videos" }, { status: 500 })
  }
}
