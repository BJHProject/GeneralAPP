export const runtime = "nodejs"
export const maxDuration = 180

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ensureUserExists, chargeCredits } from "@/lib/credits"
import { defaultAIClient } from "@/lib/ai-client"

const STYLE_TO_MODEL: Record<string, { modelId: string; operation: "video1" | "video3" | "video5" }> = {
  lovely: { modelId: "video-lovely", operation: "video3" },
  express: { modelId: "video-express", operation: "video3" },
  "express-hd": { modelId: "video-express-hd", operation: "video5" },
  elite: { modelId: "video-elite", operation: "video5" },
  elitist: { modelId: "video-elite", operation: "video5" },
}

export async function POST(request: Request) {
  console.log("[v0] ========== VIDEO GENERATION API ==========")

  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] No authenticated user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", user.id)
    await ensureUserExists(user.id, user.email!, user.user_metadata?.full_name, user.user_metadata?.avatar_url)

    const body = await request.json()
    const { imageUrl, prompt, style = "lovely" } = body

    if (!imageUrl || !prompt) {
      return NextResponse.json({ error: "Image URL and prompt are required" }, { status: 400 })
    }

    console.log("[v0] Video request:", { style, prompt: prompt.substring(0, 50) + "..." })

    const config = STYLE_TO_MODEL[style.toLowerCase()]
    if (!config) {
      return NextResponse.json({ error: `Invalid style: ${style}` }, { status: 400 })
    }

    const chargeResult = await chargeCredits(user.id, config.operation)

    if (!chargeResult.success) {
      return NextResponse.json(
        { 
          error: chargeResult.error || "Failed to charge credits",
          ...(chargeResult.error === "insufficient credits" && { 
            insufficientCredits: true 
          })
        },
        { status: chargeResult.error === "insufficient credits" ? 402 : 500 },
      )
    }

    console.log("[v0] Credits charged, new balance:", chargeResult.newBalance)

    const result = await defaultAIClient.generate({
      type: "video",
      modelId: config.modelId,
      prompt,
      userId: user.id,
      inputImageUrl: imageUrl,
    })

    if (!result.success) {
      console.error("[v0] Video generation failed:", result.error)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    console.log("[v0] ✓ Video generated:", result.mediaUrl)

    const { error: insertError } = await supabase.from("videos").insert({
      user_id: user.id,
      url: result.mediaUrl,
      prompt,
      duration_seconds: config.operation === "video1" ? 1 : config.operation === "video3" ? 3 : 5,
      is_saved: false,
    })

    if (insertError) {
      console.error("[v0] Failed to save video metadata:", insertError)
    }

    return NextResponse.json({
      url: result.mediaUrl,
      credits: chargeResult.newBalance,
      metadata: result.metadata,
    })
  } catch (error: any) {
    console.error("[v0] Video generation error:", error)
    return NextResponse.json(
      { error: error.message || "Video generation failed" },
      { status: 500 },
    )
  }
}
