export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { ingestImageToBlob, pruneTempMedia } from "@/lib/media-helpers"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Ingest API called")

    // Verify session
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const contentType = request.headers.get("content-type")
    let imageUrl: string
    let prompt: string | undefined
    let width: number | undefined
    let height: number | undefined
    let metadata: any

    if (contentType?.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await request.formData()
      const file = formData.get("image") as File
      
      if (!file) {
        return NextResponse.json({ error: "Image file is required" }, { status: 400 })
      }

      // Convert file to data URL
      const buffer = await file.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      imageUrl = `data:${file.type};base64,${base64}`
      
      prompt = formData.get("prompt") as string | undefined
      width = formData.get("width") ? Number(formData.get("width")) : undefined
      height = formData.get("height") ? Number(formData.get("height")) : undefined
      metadata = {}
    } else {
      // Handle JSON with URL
      const body = await request.json()
      imageUrl = body.imageUrl
      prompt = body.prompt
      width = body.width
      height = body.height
      metadata = body.metadata
      
      if (!imageUrl) {
        return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
      }
    }

    console.log("[v0] Ingesting image for user:", user.id)

    // Ingest image to Blob storage (temp prefix)
    const { storageKey, blobUrl, size, mimeType } = await ingestImageToBlob(imageUrl, user.id, "temp", {
      prompt,
      width,
      height,
    })

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Insert media record
    const { data: mediaRecord, error: insertError } = await supabase
      .from("media")
      .insert({
        user_id: user.id,
        status: "temp",
        storage_key: storageKey,
        mime_type: mimeType,
        size_bytes: size,
        width,
        height,
        prompt,
        expires_at: expiresAt.toISOString(),
        metadata: metadata || {},
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error inserting media record:", insertError)
      throw insertError
    }

    console.log("[v0] Media record created:", mediaRecord.id)

    // Prune old temp items (keep only 10 most recent)
    await pruneTempMedia(user.id)

    // Return the direct blob URL for public access by external APIs (e.g., Wavespeed)
    // The media proxy URL requires authentication and won't work with external services
    console.log("[v0] Returning blob URL:", blobUrl)

    return NextResponse.json({
      id: mediaRecord.id,
      url: blobUrl,
      expiresAt: expiresAt.toISOString(),
      status: "temp",
    })
  } catch (error) {
    console.error("[v0] Ingest error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to ingest image"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
