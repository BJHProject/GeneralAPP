import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, imageId } = await request.json()

    if (!imageUrl && !imageId) {
      return NextResponse.json({ error: "No image URL or ID provided" }, { status: 400 })
    }

    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (imageId) {
      const { error } = await supabase
        .from("images")
        .update({ is_saved: true })
        .eq("id", imageId)
        .eq("user_id", user.id)

      if (error) {
        throw error
      }

      return NextResponse.json({ success: true })
    }

    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch image")
    }

    const imageBlob = await imageResponse.blob()
    const timestamp = Date.now()
    const filename = `generated-${timestamp}.png`

    const blob = await put(filename, imageBlob, {
      access: "public",
      addRandomSuffix: true,
    })

    return NextResponse.json({
      url: blob.url,
      filename,
      savedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Save error:", error)
    return NextResponse.json({ error: "Failed to save image" }, { status: 500 })
  }
}
