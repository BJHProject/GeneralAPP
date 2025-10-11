export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Verify session and ownership
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch media metadata
    const { data: media, error } = await supabase.from("media").select("*").eq("id", id).eq("user_id", user.id).single()

    if (error || !media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 })
    }

    // Stream the Blob object
    const blobUrl = `https://${process.env.BLOB_READ_WRITE_TOKEN?.split("_")[1]}.public.blob.vercel-storage.com/${media.storage_key}`
    const response = await fetch(blobUrl)

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch media" }, { status: 500 })
    }

    const blob = await response.blob()

    return new NextResponse(blob, {
      headers: {
        "Content-Type": media.mime_type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("[v0] Media fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch media" }, { status: 500 })
  }
}
