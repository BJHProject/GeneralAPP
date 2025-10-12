export const runtime = "nodejs"
export const maxDuration = 180

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ensureUserExists } from "@/lib/credits"
import { defaultAIClient } from "@/lib/ai-client"
import { videoGenerationSchema } from "@/lib/validation/schemas"
import { atomicCreditCharge, completeGenerationJob, refundFailedJob } from "@/lib/credits/transactions"
import { rateLimitMiddleware } from "@/lib/security/rate-limit"
import { validateModelId } from "@/lib/security/model-validator"
import type { CreditOperation } from "@/lib/credits"

const STYLE_TO_MODEL: Record<string, { modelId: string; operation: CreditOperation }> = {
  lovely: { modelId: "video-lovely", operation: "video3" },
  express: { modelId: "video-express", operation: "video3" },
  "express-hd": { modelId: "video-express-hd", operation: "video5" },
  elite: { modelId: "video-elite", operation: "video5" },
  elitist: { modelId: "video-elite", operation: "video5" },
}

export async function POST(request: NextRequest) {
  console.log("[Security] ========== SECURE VIDEO GENERATION API ==========")

  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[Security] No authenticated user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimitResponse = await rateLimitMiddleware(request, user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    console.log("[Security] User authenticated:", user.id)
    await ensureUserExists(user.id, user.email!, user.user_metadata?.full_name, user.user_metadata?.avatar_url)

    const body = await request.json()
    
    const validation = videoGenerationSchema.safeParse({
      ...body,
      duration: body.style ? 
        (body.style === 'lovely' || body.style === 'express' ? '3' : '5') : 
        '3',
    })
    
    if (!validation.success) {
      console.warn("[Security] Invalid request payload:", validation.error.format())
      return NextResponse.json(
        { 
          error: "Invalid request parameters",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { imageUrl, prompt, idempotency_key } = validation.data
    const style = body.style?.toLowerCase() || 'lovely'

    if (!imageUrl || !prompt) {
      return NextResponse.json({ error: "Image URL and prompt are required" }, { status: 400 })
    }

    console.log("[Security] Video request validated:", { style, prompt: prompt.substring(0, 50) + "..." })

    const config = STYLE_TO_MODEL[style]
    if (!config) {
      return NextResponse.json({ error: `Invalid style: ${style}` }, { status: 400 })
    }

    const modelValidation = validateModelId(config.modelId)
    if (!modelValidation.valid) {
      console.warn("[Security] Invalid model ID:", config.modelId)
      return NextResponse.json({ error: modelValidation.error }, { status: 400 })
    }

    const chargeResult = await atomicCreditCharge(
      user.id,
      config.operation,
      idempotency_key,
      { model: config.modelId, prompt: prompt.substring(0, 100), style }
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

    const result = await defaultAIClient.generate({
      type: "video",
      modelId: config.modelId,
      prompt,
      userId: user.id,
      inputImageUrl: imageUrl,
    })

    if (!result.success) {
      console.error("[Security] Video generation failed, refunding credits:", result.error)
      await refundFailedJob(jobId, result.error || 'Video generation failed')
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    console.log("[Security] ✓ Video generated successfully:", result.mediaUrl)

    await completeGenerationJob(jobId, true, result.mediaUrl)

    const { error: insertError } = await supabase.from("videos").insert({
      user_id: user.id,
      url: result.mediaUrl,
      prompt,
      duration_seconds: config.operation === "video1" ? 1 : config.operation === "video3" ? 3 : 5,
      is_saved: false,
    })

    if (insertError) {
      console.error("[Security] Failed to save video metadata:", insertError)
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
    console.error("[Security] Video generation error:", error)
    return NextResponse.json(
      { error: error.message || "Video generation failed" },
      { status: 500 },
    )
  }
}
