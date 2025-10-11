import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { videoId } = await request.json()

    console.log("[v0] Saving video:", videoId)

    const { error } = await supabase.from("videos").update({ is_saved: true }).eq("id", videoId).eq("user_id", user.id)

    if (error) {
      console.error("[v0] Error saving video:", error)
      throw error
    }

    console.log("[v0] Video saved successfully")
    return Response.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in save-video API:", error)
    return Response.json({ error: "Failed to save video" }, { status: 500 })
  }
}
