import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ensureUserExists, chargeCredits } from "@/lib/credits"
import { defaultAIClient } from "@/lib/ai-client"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  console.log("[v0] ========== IMAGE EDIT API ==========")

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
    const { imageUrl, prompt } = body

    if (!imageUrl || !prompt) {
      return NextResponse.json({ error: "Image URL and prompt are required" }, { status: 400 })
    }

    console.log("[v0] Edit request:", { prompt: prompt.substring(0, 50) + "..." })

    const chargeResult = await chargeCredits(user.id, "edit")

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
      type: "edited-image",
      modelId: "wavespeed-edit",
      prompt,
      userId: user.id,
      inputImageUrl: imageUrl,
    })

    if (!result.success) {
      console.error("[v0] Edit failed:", result.error)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    console.log("[v0] ✓ Image edited:", result.mediaUrl)

    const { error: insertError } = await supabase.from("edited_images").insert({
      user_id: user.id,
      input_image_url: imageUrl,
      output_image_url: result.mediaUrl,
      prompt,
      is_saved: false,
    })

    if (insertError) {
      console.error("[v0] Failed to save edited image metadata:", insertError)
    }

    return NextResponse.json({
      url: result.mediaUrl,
      credits: chargeResult.newBalance,
      metadata: result.metadata,
    })
  } catch (error: any) {
    console.error("[v0] Edit error:", error)
    return NextResponse.json(
      { error: error.message || "Edit failed" },
      { status: 500 },
    )
  }
}
