export const runtime = "nodejs"
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { ensureUserExists } from "@/lib/credits"
import { defaultAIClient } from "@/lib/ai-client"
import { imageGenerationSchema } from "@/lib/validation/schemas"
import { atomicCreditCharge, completeGenerationJob, refundFailedJob } from "@/lib/credits/transactions"
import { rateLimitMiddleware } from "@/lib/security/rate-limit-db"
import { validateModelId } from "@/lib/security/model-validator"

export async function POST(request: NextRequest) {
  console.log("[Security] ========== SECURE IMAGE GENERATION API ==========")

  try {
    const supabase = await createServerClient()

    const { data: settings } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "app_enabled")
      .single()

    const appEnabled = settings?.setting_value ?? true

    if (!appEnabled) {
      console.log("[Security] Image generation is currently disabled")
      return NextResponse.json(
        { error: "Image generation is temporarily disabled. Please try again later." },
        { status: 503 },
      )
    }

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
    
    const validation = imageGenerationSchema.safeParse(body)
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

    const { model, prompt, negative_prompt, width, height, guidance_scale, num_inference_steps, seed, idempotency_key } = validation.data

    const modelId = model || "flux-dev"
    const modelValidation = validateModelId(modelId)
    
    if (!modelValidation.valid) {
      console.warn("[Security] Invalid model ID:", modelId)
      return NextResponse.json(
        { error: modelValidation.error },
        { status: 400 }
      )
    }

    console.log("[Security] Request validated:", { 
      model: modelId, 
      prompt: prompt.substring(0, 50) + "...",
      width,
      height,
    })

    const chargeResult = await atomicCreditCharge(
      user.id,
      "image",
      idempotency_key,
      { model: modelId, prompt: prompt.substring(0, 100) }
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
      type: "image",
      modelId,
      prompt,
      userId: user.id,
      width,
      height,
      steps: num_inference_steps,
      guidance: guidance_scale,
      seed,
    })

    if (!result.success) {
      console.error("[Security] Generation failed, refunding credits:", result.error)
      await refundFailedJob(jobId, result.error || 'Generation failed')
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    console.log("[Security] ✓ Image generated successfully:", result.mediaUrl)

    await completeGenerationJob(jobId, true, result.mediaUrl)

    const { error: insertError } = await supabase.from("images").insert({
      user_id: user.id,
      url: result.mediaUrl,
      prompt,
      width: width || 1024,
      height: height || 1024,
      is_saved: false,
    })

    if (insertError) {
      console.error("[Security] Failed to save image metadata:", insertError)
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
    console.error("[Security] Generation error:", error)
    return NextResponse.json(
      { error: error.message || "Generation failed" },
      { status: 500 },
    )
  }
}
