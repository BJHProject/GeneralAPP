import { list } from "@vercel/blob"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Listing images from Blob storage")

    // Check if token is available
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("[v0] BLOB_READ_WRITE_TOKEN is not configured")
      return NextResponse.json({ images: [] })
    }

    const { blobs } = await list()
    console.log("[v0] Found", blobs.length, "images")

    // Sort by upload time (newest first)
    const sortedBlobs = blobs.sort((a, b) => {
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    })

    const images = sortedBlobs.map((blob) => ({
      url: blob.url,
      filename: blob.pathname,
      uploadedAt: blob.uploadedAt,
      size: blob.size,
    }))

    return NextResponse.json({ images })
  } catch (error) {
    console.error("[v0] Error listing images:", error)
    // Return empty array instead of error to prevent UI breaking
    return NextResponse.json({ images: [] })
  }
}
