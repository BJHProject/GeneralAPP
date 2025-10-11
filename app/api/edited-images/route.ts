import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch saved images (no limit)
    const { data: savedImages, error: savedError } = await supabase
      .from("edited_images")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_saved", true)
      .order("created_at", { ascending: false })

    if (savedError) throw savedError

    // Fetch recent unsaved images (limit 10)
    const { data: recentImages, error: recentError } = await supabase
      .from("edited_images")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_saved", false)
      .order("created_at", { ascending: false })
      .limit(10)

    if (recentError) throw recentError

    return NextResponse.json({
      saved: savedImages || [],
      recent: recentImages || [],
    })
  } catch (error: any) {
    console.error("[v0] Error fetching edited images:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
