export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const metadata = searchParams.get('metadata') === 'true'

    // Verify session and ownership
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // If metadata requested, fetch from images table
    if (metadata) {
      const { data: image, error } = await supabase
        .from("images")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single()

      if (error || !image) {
        return NextResponse.json({ error: "Image not found" }, { status: 404 })
      }

      return NextResponse.json(image)
    }

    // Otherwise, fetch media metadata for blob streaming
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
