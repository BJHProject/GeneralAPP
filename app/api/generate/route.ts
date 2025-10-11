export const runtime = "nodejs"
export const maxDuration = 60 // 1 minute

import { createServerClient } from "@/lib/supabase/server"
import { Client } from "@gradio/client"
import { ingestImageToBlob } from "@/lib/media-helpers"
import { auth } from "@/lib/auth"
import {
  chargeCredits,
  checkIdempotency,
  createIdempotencyKey,
  updateIdempotencyKey,
  ensureUserExists,
} from "@/lib/credits"

type ModelProvider = "gradio" | "wavespeed" | "huggingface_endpoint"

interface ModelConfig {
  id: string
  displayName: string
  provider: ModelProvider
  gradioSpace?: string
  wavespeedEndpoint?: string
  huggingfaceEndpoint?: boolean
  maxDimension: number
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  realistic: {
    id: "realistic",
    displayName: "Realistic",
    provider: "gradio",
    gradioSpace: "aiqtech/NSFW-Real",
    maxDimension: 1216,
  },
  realistic_w: {
    id: "realistic_w",
    displayName: "Realistic W",
    provider: "wavespeed",
    wavespeedEndpoint: "https://api.wavespeed.ai/api/v3/wavespeed-ai/female-human",
    maxDimension: 1216,
  },
  anime: {
    id: "anime",
    displayName: "Anime",
    provider: "gradio",
    gradioSpace: "dhead/WaiNSFWIllustrious_V130",
    maxDimension: 1536,
  },
  anime_v2: {
    id: "anime_v2",
    displayName: "Anime V2",
    provider: "gradio",
    gradioSpace: "Menyu/wainsfw",
    maxDimension: 1536,
  },
  neon: {
    id: "neon",
    displayName: "Neon",
    provider: "huggingface_endpoint",
    huggingfaceEndpoint: true,
    maxDimension: 2048,
  },
  preview: {
    id: "preview",
    displayName: "Preview",
    provider: "gradio",
    gradioSpace: "Heartsync/PornHUB",
    maxDimension: 1216,
  },
  preview_anime: {
    id: "preview_anime",
    displayName: "Preview Anime",
    provider: "gradio",
    gradioSpace: "Heartsync/Hentai-Adult",
    maxDimension: 1536,
  },
}

const VALIDATION_LIMITS = {
  guidanceScale: { min: 1, max: 20, default: 7 },
  inferenceSteps: { min: 1, max: 50, default: 28 },
  width: { min: 256, max: 2048 },
  height: { min: 256, max: 2048 },
}

function validateAndClampParameter(value: number | undefined, paramName: keyof typeof VALIDATION_LIMITS): number {
  const limits = VALIDATION_LIMITS[paramName]
  const numValue = value || limits.default

  if (numValue < limits.min) {
    console.log(`[v0] ${paramName} ${numValue} below minimum ${limits.min}, clamping to ${limits.min}`)
    return limits.min
  }
  if (numValue > limits.max) {
    console.log(`[v0] ${paramName} ${numValue} above maximum ${limits.max}, clamping to ${limits.max}`)
    return limits.max
  }

  return numValue
}

function getHuggingFaceTokens(): string[] {
  const tokens: string[] = []

  if (process.env.HUGGINGFACE_API_TOKEN) {
    tokens.push(process.env.HUGGINGFACE_API_TOKEN)
  }
  if (process.env.HUGGINGFACE_API_TOKEN_2) {
    tokens.push(process.env.HUGGINGFACE_API_TOKEN_2)
  }
  if (process.env.HUGGINGFACE_API_TOKEN_3) {
    tokens.push(process.env.HUGGINGFACE_API_TOKEN_3)
  }

  return tokens
}

function isRateLimitError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || ""
  return (
    errorMessage.includes("rate limit") ||
    errorMessage.includes("quota") ||
    errorMessage.includes("429") ||
    errorMessage.includes("too many requests") ||
    errorMessage.includes("exceeded") ||
    errorMessage.includes("limit reached") ||
    errorMessage.includes("insufficient") ||
    errorMessage.includes("out of credits")
  )
}

function isRetryableError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || ""
  return (
    isRateLimitError(error) ||
    errorMessage.includes("space metadata") ||
    errorMessage.includes("not found") ||
    errorMessage.includes("unavailable") ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("connection")
  )
}

async function generateWithWavespeed(
  endpoint: string,
  prompt: string,
  width: number,
  height: number,
  tokenIndex = 0,
): Promise<{ requestId: string; isAsync: true } | string[]> {
  const wavespeedApiKey = process.env.WAVESPEED_API_KEY

  if (!wavespeedApiKey) {
    throw new Error("WAVESPEED_API_KEY not configured")
  }

  const tokens = getHuggingFaceTokens()
  console.log(`[v0] Wavespeed: Attempting with token ${tokenIndex + 1}/${tokens.length}`)

  try {
    console.log("[v0] Submitting generation task to Wavespeed API:", endpoint)
    const size = `${width}*${height}`

    const submitResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${wavespeedApiKey}`,
      },
      body: JSON.stringify({
        enable_base64_output: false,
        enable_sync_mode: false,
        output_format: "jpeg",
        prompt: prompt,
        seed: -1,
        width: width,
        height: height,
      }),
    })

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text()
      console.error("[v0] Wavespeed submit error:", errorText)

      const isRateLimitError =
        errorText.toLowerCase().includes("quota") ||
        errorText.toLowerCase().includes("limit") ||
        errorText.toLowerCase().includes("exceeded") ||
        submitResponse.status === 429

      if (isRateLimitError && tokenIndex < tokens.length - 1) {
        console.log(`[v0] ✗ Rate limit on token ${tokenIndex + 1}, trying next token`)
        return generateWithWavespeed(endpoint, prompt, width, height, tokenIndex + 1)
      }

      throw new Error(`Wavespeed API error: ${errorText}`)
    }

    const submitData = await submitResponse.json()
    console.log("[v0] Generation task submitted. Full response:", JSON.stringify(submitData, null, 2))

    const requestId = submitData.data?.id || submitData.request_id || submitData.requestId || submitData.id

    if (!requestId) {
      console.error("[v0] No request ID found. Response:", submitData)
      throw new Error("No request ID returned from Wavespeed API")
    }

    console.log("[v0] ✓ Got request ID:", requestId)
    console.log("[v0] Returning request ID for async polling")
    return { requestId, isAsync: true }
  } catch (error: any) {
    console.error(`[v0] ✗ Error with token ${tokenIndex + 1}:`, error.message)

    const errorMessage = error.message.toLowerCase()
    const shouldRetry =
      errorMessage.includes("quota") ||
      errorMessage.includes("limit") ||
      errorMessage.includes("exceeded") ||
      errorMessage.includes("rate") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("connection")

    if (shouldRetry && tokenIndex < tokens.length - 1) {
      console.log(`[v0] Trying next token (${tokenIndex + 2}/${tokens.length})`)
      return generateWithWavespeed(endpoint, prompt, width, height, tokenIndex + 1)
    }

    console.log(`[v0] All ${tokens.length} token(s) exhausted`)
    throw error
  }
}

async function generateWithGradio(
  spaceName: string,
  modelId: string,
  prompt: string,
  negativePrompt: string,
  width: number,
  height: number,
  guidanceScale: number,
  numInferenceSteps: number,
): Promise<string[]> {
  console.log("[v0] Starting Gradio generation with space:", spaceName)

  const tokens = getHuggingFaceTokens()
  console.log("[v0] Found", tokens.length, "HuggingFace token(s)")

  if (tokens.length === 0) {
    throw new Error("No HuggingFace API tokens configured")
  }

  let lastError: any = null
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    console.log(`[v0] Gradio: Attempting with token ${i + 1}/${tokens.length}`)

    let client: any = null
    try {
      console.log(`[v0] Connecting to Gradio space with token ${i + 1}...`)
      client = await Client.connect(spaceName, {
        hf_token: token,
      })
      console.log(`[v0] Successfully connected to Gradio space`)

      const params: any = {
        prompt: prompt,
        negative_prompt: negativePrompt,
        seed: 0,
        randomize_seed: true,
        width: width,
        height: height,
        guidance_scale: guidanceScale,
        num_inference_steps: numInferenceSteps,
      }

      if (modelId === "anime_v2") {
        params.use_negative_prompt = true
      }

      console.log("[v0] Sending prediction request")
      const result = await client.predict("/infer", params)
      console.log("[v0] Received prediction result")

      if (result.data && result.data[0]) {
        const imageData = result.data[0]
        const imageUrl = typeof imageData === "string" ? imageData : imageData.url
        if (imageUrl) {
          console.log(`[v0] ✓ Image generated successfully with token ${i + 1}`)
          return [imageUrl]
        }
      }

      throw new Error("No image URL in response")
    } catch (error) {
      console.error(`[v0] ✗ Error with token ${i + 1}:`, error)
      lastError = error

      if (i < tokens.length - 1) {
        if (isRateLimitError(error)) {
          console.log(`[v0] Rate limit on token ${i + 1}, switching to token ${i + 2}`)
          continue
        } else if (isRetryableError(error)) {
          console.log(`[v0] Retryable error on token ${i + 1}, trying token ${i + 2}`)
          continue
        }
      }

      if (i === tokens.length - 1) {
        console.error(`[v0] All ${tokens.length} token(s) exhausted`)
      }
      throw error
    } finally {
      if (client && typeof client.close === "function") {
        try {
          await client.close()
          console.log(`[v0] Gradio client closed for token ${i + 1}`)
        } catch (closeError) {
          console.error("[v0] Error closing Gradio client:", closeError)
        }
      }
    }
  }

  throw lastError || new Error("All HuggingFace accounts exhausted")
}

async function generateWithHuggingFaceEndpoint(
  prompt: string,
  negativePrompt: string,
  width: number,
  height: number,
  guidanceScale: number,
  inferenceSteps: number,
  seed = -1,
): Promise<string[]> {
  console.log("[v0] Starting HuggingFace Endpoint generation")

  const hfEndpointUrl = process.env.HF_ENDPOINT_URL
  const hfToken = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_TOKEN

  if (!hfEndpointUrl) {
    throw new Error("HF_ENDPOINT_URL not configured")
  }

  if (!hfToken) {
    throw new Error("HF_TOKEN not configured")
  }

  console.log("[v0] Using HuggingFace Endpoint:", hfEndpointUrl)

  const enhancedPrompt = `${prompt}, perfect resolution, ultra detailed, detailed image`

  const neonNegativePrompt =
    negativePrompt || "sensitive, nsfw, explicit, bad quality, worst quality, worst detail, sketch, censor"

  try {
    const requestBody = {
      inputs: {
        model: "v14",
        prompt: enhancedPrompt,
        negative_prompt: neonNegativePrompt,
        steps: inferenceSteps,
        guidance: guidanceScale,
        width: width,
        height: height,
        seed: seed,
      },
      parameters: {},
    }

    console.log("[v0] Sending request to HuggingFace Endpoint:", JSON.stringify(requestBody, null, 2))

    const response = await fetch(hfEndpointUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
        "X-Scale-Up-Timeout": "600",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] HuggingFace Endpoint error:", errorText)
      throw new Error(`HuggingFace Endpoint error: ${errorText}`)
    }

    const data = await response.json()
    console.log("[v0] HuggingFace Endpoint response received:", JSON.stringify(data, null, 2))

    if (data.content_type && data.image_b64) {
      const dataUrl = `data:${data.content_type};base64,${data.image_b64}`
      console.log("[v0] ✓ Image generated successfully from HuggingFace Endpoint")
      return [dataUrl]
    } else {
      console.error("[v0] Invalid response format:", data)
      throw new Error("Invalid response format from HuggingFace Endpoint")
    }
  } catch (error) {
    console.error("[v0] HuggingFace Endpoint generation error:", error)
    throw error
  }
}

export async function POST(request: Request) {
  console.log("[v0] ========== GENERATE API REQUEST RECEIVED ==========")
  console.log("[v0] Request URL:", request.url)
  console.log("[v0] Request method:", request.method)

  try {
    const supabase = await createServerClient()

    const { data: settings } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "app_enabled")
      .single()

    const appEnabled = settings?.setting_value ?? true

    if (!appEnabled) {
      console.log("[v0] Image generation is currently disabled by admin")
      return Response.json(
        { error: "Image generation is temporarily disabled. Please try again later." },
        { status: 503 },
      )
    }

    console.log("[v0] Parsing request body...")
    const body = await request.json()
    console.log("[v0] Request body parsed:", JSON.stringify(body, null, 2))

    const { model, prompt, negative_prompt, width, height, guidance_scale, num_inference_steps, idempotency_key } = body

    console.log("[v0] Generate API called with model:", model, "prompt:", prompt)

    const validatedGuidanceScale = validateAndClampParameter(guidance_scale, "guidanceScale")
    const validatedInferenceSteps = validateAndClampParameter(num_inference_steps, "inferenceSteps")
    const validatedWidth = validateAndClampParameter(width, "width")
    const validatedHeight = validateAndClampParameter(height, "height")

    console.log("[v0] Validated parameters:", {
      guidanceScale: validatedGuidanceScale,
      inferenceSteps: validatedInferenceSteps,
      width: validatedWidth,
      height: validatedHeight,
    })

    if (!prompt) {
      return Response.json({ error: "Prompt is required" }, { status: 400 })
    }

    const modelConfig = MODEL_CONFIGS[model || "realistic"]
    if (!modelConfig) {
      return Response.json({ error: "Invalid model selected" }, { status: 400 })
    }

    console.log("[v0] Using model config:", modelConfig.displayName, "provider:", modelConfig.provider)

    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    try {
      await ensureUserExists(userId, session.user.email!, session.user.name, session.user.image)
    } catch (error) {
      console.error("[v0] Failed to ensure user exists:", error)
      return Response.json({ error: "Failed to initialize user account" }, { status: 500 })
    }

    if (idempotency_key) {
      const idempotencyCheck = await checkIdempotency(idempotency_key, userId)
      if (idempotencyCheck.exists) {
        if (idempotencyCheck.status === "succeeded" && idempotencyCheck.result) {
          console.log("[v0] Returning cached result")
          return Response.json(idempotencyCheck.result)
        }
        if (idempotencyCheck.status === "started") {
          return Response.json({ error: "Request already in progress" }, { status: 409 })
        }
      }

      await createIdempotencyKey(idempotency_key, userId, "image", "started")
    }

    const chargeResult = await chargeCredits(userId, "image")
    if (!chargeResult.success) {
      if (idempotency_key) {
        await updateIdempotencyKey(idempotency_key, "failed")
      }
      return Response.json({ error: chargeResult.error || "Insufficient credits" }, { status: 409 })
    }

    console.log("[v0] Credits charged. New balance:", chargeResult.newBalance)

    const finalWidth = Math.min(validatedWidth, modelConfig.maxDimension)
    const finalHeight = Math.min(validatedHeight, modelConfig.maxDimension)

    try {
      let images: string[]
      let wavespeedRequestId: string | undefined

      if (modelConfig.provider === "wavespeed") {
        if (!modelConfig.wavespeedEndpoint) {
          throw new Error("Wavespeed endpoint not configured for this model")
        }
        console.log("[v0] Using Wavespeed API for model:", modelConfig.displayName)
        const result = await generateWithWavespeed(modelConfig.wavespeedEndpoint, prompt, finalWidth, finalHeight)

        if (typeof result === "object" && "isAsync" in result && result.isAsync) {
          console.log("[v0] Wavespeed generation started async, returning request ID")
          return Response.json({
            isAsync: true,
            requestId: result.requestId,
            message: "Generation started. Poll for results.",
          })
        } else {
          images = result as string[]
        }
      } else if (modelConfig.provider === "gradio") {
        if (!modelConfig.gradioSpace) {
          throw new Error("Gradio space not configured for this model")
        }
        console.log("[v0] Using Gradio API for model:", modelConfig.displayName)
        images = await generateWithGradio(
          modelConfig.gradioSpace,
          modelConfig.id,
          prompt,
          negative_prompt ||
            "nsfw, (low quality, worst quality:1.2), very displeasing, 3d, watermark, signature, ugly, poorly drawn",
          finalWidth,
          finalHeight,
          validatedGuidanceScale,
          validatedInferenceSteps,
        )
      } else if (modelConfig.provider === "huggingface_endpoint") {
        console.log("[v0] Using HuggingFace Endpoint for model:", modelConfig.displayName)
        const randomSeed = Math.floor(Math.random() * 2147483647)
        images = await generateWithHuggingFaceEndpoint(
          prompt,
          negative_prompt ||
            "nsfw, (low quality, worst quality:1.2), very displeasing, 3d, watermark, signature, ugly, poorly drawn",
          finalWidth,
          finalHeight,
          validatedGuidanceScale,
          validatedInferenceSteps,
          randomSeed,
        )
      } else {
        throw new Error("Unknown provider for model")
      }

      console.log("[v0] Re-uploading images to Blob storage")
      const reuploadedImages = await Promise.all(
        images.map(async (externalUrl) => {
          try {
            const { blobUrl } = await ingestImageToBlob(externalUrl, userId, "temp", {
              prompt,
              width: finalWidth,
              height: finalHeight,
            })
            console.log("[v0] Image re-uploaded to Blob:", blobUrl)
            return blobUrl
          } catch (error) {
            console.error("[v0] Failed to re-upload image, using original URL:", error)
            return externalUrl
          }
        }),
      )

      const imageRecords = reuploadedImages.map((url) => ({
        user_id: userId,
        url,
        prompt,
        width: finalWidth,
        height: finalHeight,
        is_saved: false,
      }))

      console.log("[v0] Inserting image records:", imageRecords.length)
      const { error: insertError } = await supabase.from("images").insert(imageRecords)

      if (insertError) {
        console.error("[v0] Insert error:", insertError)
      } else {
        console.log("[v0] Images saved to database successfully")
      }

      const { data: tempImages } = await supabase
        .from("images")
        .select("id")
        .eq("user_id", userId)
        .eq("is_saved", false)
        .order("created_at", { ascending: false })

      if (tempImages && tempImages.length > 10) {
        const imagesToDelete = tempImages.slice(10).map((img) => img.id)
        console.log("[v0] Deleting old temporary images:", imagesToDelete.length)
        await supabase.from("images").delete().in("id", imagesToDelete)
      }

      const result = {
        images: reuploadedImages.map((url) => ({ url })),
        creditsRemaining: chargeResult.newBalance,
        creditsUsed: 500,
      }

      if (idempotency_key) {
        await updateIdempotencyKey(idempotency_key, "succeeded", result)
      }

      console.log("[v0] Returning re-uploaded images")
      return Response.json(result)
    } catch (genError) {
      console.error("[v0] Generation error:", genError)

      if (idempotency_key) {
        await updateIdempotencyKey(idempotency_key, "failed")
      }

      throw genError
    }
  } catch (error) {
    console.error("[v0] Image generation error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to generate images. Please try again."
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}
