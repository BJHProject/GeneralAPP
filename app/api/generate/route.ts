export const runtime = "nodejs"
export const maxDuration = 60

import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { chargeCredits, checkIdempotency, createIdempotencyKey, updateIdempotencyKey, ensureUserExists } from "@/lib/credits"
import { defaultAIClient } from "@/lib/ai-client"

export async function POST(request: Request) {
  console.log("[v0] ========== IMAGE GENERATION API ==========")

  try {
    const supabase = await createServerClient()

    const { data: settings } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "app_enabled")
      .single()

    const appEnabled = settings?.setting_value ?? true

    if (!appEnabled) {
      console.log("[v0] Image generation is currently disabled")
      return NextResponse.json(
        { error: "Image generation is temporarily disabled. Please try again later." },
        { status: 503 },
      )
    }

    const body = await request.json()
    const { 
      model, 
      prompt, 
      negative_prompt, 
      width, 
      height, 
      guidance_scale, 
      num_inference_steps, 
      seed,
      idempotency_key 
    } = body

    console.log("[v0] Request:", { model, prompt: prompt?.substring(0, 50) + "..." })

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] No authenticated user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", user.id)
    await ensureUserExists(user.id, user.email!, user.user_metadata?.full_name, user.user_metadata?.avatar_url)

    if (idempotency_key) {
      const existing = await checkIdempotency(idempotency_key, user.id)
      if (existing.exists) {
        if (existing.status === "succeeded" && existing.result) {
          console.log("[v0] Returning cached result from idempotency key")
          return NextResponse.json(existing.result)
        }
        if (existing.status === "started") {
          return NextResponse.json({ error: "Request already processing" }, { status: 409 })
        }
      }
    }

    if (idempotency_key) {
      await createIdempotencyKey(idempotency_key, user.id, "image", "started")
    }

    const modelId = model || "flux-dev"
    const chargeResult = await chargeCredits(user.id, "image", idempotency_key)

    if (!chargeResult.success) {
      if (idempotency_key) {
        await updateIdempotencyKey(idempotency_key, "failed")
      }
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
      console.error("[v0] Generation failed:", result.error)
      if (idempotency_key) {
        await updateIdempotencyKey(idempotency_key, "failed")
      }
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    console.log("[v0] ✓ Image generated:", result.mediaUrl)

    const { error: insertError } = await supabase.from("images").insert({
      user_id: user.id,
      url: result.mediaUrl,
      prompt,
      width: width || 1024,
      height: height || 1024,
      is_saved: false,
    })

    if (insertError) {
      console.error("[v0] Failed to save image metadata:", insertError)
    }

    const responseData = {
      url: result.mediaUrl,
      credits: chargeResult.newBalance,
      metadata: result.metadata,
    }

    if (idempotency_key) {
      await updateIdempotencyKey(idempotency_key, "succeeded", responseData)
    }

    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error("[v0] Generation error:", error)
    return NextResponse.json(
      { error: error.message || "Generation failed" },
      { status: 500 },
    )
  }
}
