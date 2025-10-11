export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { del } from "@vercel/blob"

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || "your-secret-key"

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Running temp media cleanup cron job")

    const supabase = await createServerClient()

    // Find expired temp media
    const { data: expiredMedia, error: fetchError } = await supabase
      .from("media")
      .select("id, storage_key")
      .eq("status", "temp")
      .lt("expires_at", new Date().toISOString())

    if (fetchError) {
      console.error("[v0] Error fetching expired media:", fetchError)
      throw fetchError
    }

    if (!expiredMedia || expiredMedia.length === 0) {
      console.log("[v0] No expired media to clean up")
      return NextResponse.json({ deleted: 0 })
    }

    console.log(`[v0] Found ${expiredMedia.length} expired media items`)

    // Delete from database
    const idsToDelete = expiredMedia.map((item) => item.id)
    const { error: deleteError } = await supabase.from("media").delete().in("id", idsToDelete)

    if (deleteError) {
      console.error("[v0] Error deleting expired media from DB:", deleteError)
      throw deleteError
    }

    // Delete from Blob storage
    let deletedCount = 0
    for (const item of expiredMedia) {
      try {
        await del(item.storage_key)
        deletedCount++
        console.log(`[v0] Deleted expired Blob: ${item.storage_key}`)
      } catch (error) {
        console.error(`[v0] Error deleting Blob ${item.storage_key}:`, error)
      }
    }

    console.log(`[v0] Cleanup complete: ${deletedCount} items deleted`)
    return NextResponse.json({ deleted: deletedCount })
  } catch (error) {
    console.error("[v0] Cleanup error:", error)
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 })
  }
}
