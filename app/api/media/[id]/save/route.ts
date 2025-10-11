export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { moveToPermanen } from "@/lib/media-helpers"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Verify session
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`[v0] Saving media ${id} for user ${user.id}`)

    // Move from temp to permanent
    await moveToPermanen(id, user.id)

    return NextResponse.json({ success: true, status: "saved" })
  } catch (error) {
    console.error("[v0] Save media error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to save media"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
