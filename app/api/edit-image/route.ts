import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ensureUserExists } from "@/lib/credits"
import { defaultAIClient } from "@/lib/ai-client"
import { imageEditSchema } from "@/lib/validation/schemas"
import { atomicCreditCharge, completeGenerationJob, refundFailedJob } from "@/lib/credits/transactions"
import { rateLimitMiddleware } from "@/lib/security/rate-limit-db"
import { getImageUrlDimensions } from "@/lib/utils"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  console.log("[Security] ========== SECURE IMAGE EDIT API ==========")

  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[Security] No authenticated user")
      return NextResponse.json({ error: "Please sign in to edit images" }, { status: 401 })
    }

    const rateLimitResponse = await rateLimitMiddleware(request, user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    console.log("[Security] User authenticated:", user.id)
    await ensureUserExists(user.id, user.email!, user.user_metadata?.full_name, user.user_metadata?.avatar_url)

    const body = await request.json()

    const validation = imageEditSchema.safeParse(body)
    if (!validation.success) {
      console.warn("[Security] Invalid request payload:", validation.error.format())
      const errors = validation.error.flatten().fieldErrors
      const firstError = Object.values(errors)[0]?.[0] || "Please check your input and try again"
      return NextResponse.json(
        { 
          error: firstError,
          details: errors,
        },
        { status: 400 }
      )
    }

    const { imageUrl, prompt, idempotency_key } = validation.data

    console.log("[Security] Edit request validated:", { prompt: prompt.substring(0, 50) + "..." })

    const chargeResult = await atomicCreditCharge(
      user.id,
      "edit",
      idempotency_key,
      { prompt: prompt.substring(0, 100), imageUrl }
    )

    if (!chargeResult.success) {
      console.warn("[Security] Credit charge failed:", chargeResult.error)
      return NextResponse.json(
        { 
          error: chargeResult.error || "Failed to charge credits",
          ...(chargeResult.code === 'INSUFFICIENT_CREDITS' && { 
            insufficientCredits: true 
          })
        },
        { 
          status: chargeResult.code === 'INSUFFICIENT_CREDITS' ? 402 : 
                  chargeResult.code === 'DUPLICATE_REQUEST' ? 409 : 500
        },
      )
    }

    const jobId = chargeResult.jobId!
    console.log("[Security] ✓ Credits charged atomically. Job ID:", jobId, "Balance:", chargeResult.newBalance)

    // Get image dimensions to determine output dimensions
    const imageDimensions = await getImageUrlDimensions(imageUrl)
    const outputWidth = Math.max(1024, Math.min(4096, imageDimensions.width * 2))
    const outputHeight = Math.max(1024, Math.min(4096, imageDimensions.height * 2))

    const result = await defaultAIClient.generate({
      type: "edited-image",
      modelId: "wavespeed-edit",
      prompt,
      userId: user.id,
      inputImageUrl: imageUrl,
      width: outputWidth,
      height: outputHeight,
    })

    if (!result.success) {
      console.error("[Security] Edit failed, refunding credits:", result.error)
      await refundFailedJob(jobId, result.error || 'Edit failed')
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    console.log("[Security] ✓ Image edited successfully:", result.mediaUrl)

    await completeGenerationJob(jobId, true, result.mediaUrl)

    const { error: insertError } = await supabase.from("edited_images").insert({
      user_id: user.id,
      input_image_url: imageUrl,
      output_image_url: result.mediaUrl,
      prompt,
      is_saved: false,
    })

    if (insertError) {
      console.error("[Security] Failed to save edited image metadata:", insertError)
    }

    return NextResponse.json({
      url: result.mediaUrl,
      credits: chargeResult.newBalance,
      metadata: {
        ...result.metadata,
        jobId,
      },
    })
  } catch (error: any) {
    console.error("[Security] Edit error:", error)
    return NextResponse.json(
      { error: error.message || "Edit failed" },
      { status: 500 },
    )
  }
}