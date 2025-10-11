import { createServerClient } from "@/lib/supabase/server"

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { videoId } = await request.json()

    console.log("[v0] Deleting video:", videoId)

    const { error } = await supabase.from("videos").delete().eq("id", videoId).eq("user_id", user.id)

    if (error) {
      console.error("[v0] Error deleting video:", error)
      throw error
    }

    console.log("[v0] Video deleted successfully")
    return Response.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in delete-video API:", error)
    return Response.json({ error: "Failed to delete video" }, { status: 500 })
  }
}
