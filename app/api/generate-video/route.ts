export const runtime = "nodejs"
export const maxDuration = 60

import { createServerClient } from "@/lib/supabase/server"
import { Client } from "@gradio/client"
import { ensureUserExists, chargeCredits, CREDIT_COSTS } from "@/lib/credits"
import { put } from "@vercel/blob"

type VideoStyle = "lovely" | "express" | "express_hd" | "elite"

interface VideoStyleConfig {
  id: VideoStyle
  displayName: string
  provider: "gradio" | "wavespeed" | "huggingface_router"
  gradioSpace?: string
  wavespeedEndpoint?: string
  huggingfaceRouterEndpoint?: string
}

const VIDEO_STYLE_CONFIGS: Record<VideoStyle, VideoStyleConfig> = {
  lovely: {
    id: "lovely",
    displayName: "Lovely",
    provider: "gradio",
    gradioSpace: "zerogpu-aoti/wan2-2-fp8da-aoti-faster",
  },
  express: {
    id: "express",
    displayName: "Express",
    provider: "wavespeed",
    wavespeedEndpoint: "https://api.wavespeed.ai/api/v3/wavespeed-ai/wan-2.2/i2v-480p-ultra-fast",
  },
  express_hd: {
    id: "express_hd",
    displayName: "Express HD",
    provider: "wavespeed",
    wavespeedEndpoint: "https://api.wavespeed.ai/api/v3/wavespeed-ai/wan-2.2/i2v-720p-ultra-fast",
  },
  elite: {
    id: "elite",
    displayName: "Elite",
    provider: "huggingface_router",
    huggingfaceRouterEndpoint:
      "https://router.huggingface.co/fal-ai/fal-ai/wan/v2.2-a14b/image-to-video?_subdomain=queue",
  },
}

function getHuggingFaceTokens(): string[] {
  const tokens: string[] = []

  // Add primary token
  if (process.env.HUGGINGFACE_API_TOKEN) {
    tokens.push(process.env.HUGGINGFACE_API_TOKEN)
  }

  // Add token 2
  if (process.env.HUGGINGFACE_API_TOKEN_2) {
    tokens.push(process.env.HUGGINGFACE_API_TOKEN_2)
  }

  // Add token 3
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

async function generateVideoWithWavespeed(
  imageUrl: string,
  prompt: string,
  durationSeconds: number,
  endpoint: string,
  randomizeSeed: boolean,
  seed: number,
): Promise<string> {
  console.log("[v0] Starting video generation with Wavespeed")
  console.log("[v0] Image URL:", imageUrl)
  console.log("[v0] Prompt:", prompt)
  console.log("[v0] Duration:", durationSeconds, "seconds")

  const wavespeedApiKey = process.env.WAVESPEED_API_KEY
  if (!wavespeedApiKey) {
    throw new Error("WAVESPEED_API_KEY not configured")
  }

  console.log("[v0] Using Wavespeed endpoint:", endpoint)

  const finalSeed = randomizeSeed ? Math.floor(Math.random() * 2147483647) : seed
  console.log("[v0] Seed:", finalSeed, "(randomize:", randomizeSeed, ")")

  try {
    console.log("[v0] Submitting video generation task to Wavespeed")
    const submitResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${wavespeedApiKey}`,
      },
      body: JSON.stringify({
        duration: durationSeconds,
        image: imageUrl,
        prompt: prompt,
        seed: finalSeed, // Use calculated seed instead of hardcoded -1
      }),
    })

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text()
      console.error("[v0] Wavespeed submit error:", errorText)
      throw new Error(`Wavespeed API error: ${errorText}`)
    }

    const submitData = await submitResponse.json()
    console.log("[v0] Wavespeed submission response:", JSON.stringify(submitData, null, 2))

    const requestId = submitData.data?.id || submitData.request_id || submitData.requestId || submitData.id
    if (!requestId) {
      console.error("[v0] No request ID in response:", submitData)
      throw new Error("No request ID returned from Wavespeed API")
    }

    console.log("[v0] Got request ID:", requestId)
    console.log("[v0] Starting polling for video result")

    const resultUrl = `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`
    const maxAttempts = 60 // 5 minutes with 5 second intervals
    let attempts = 0

    while (attempts < maxAttempts) {
      attempts++
      console.log(`[v0] Polling attempt ${attempts}/${maxAttempts}`)

      await new Promise((resolve) => setTimeout(resolve, 5000))

      const resultResponse = await fetch(resultUrl, {
        headers: {
          Authorization: `Bearer ${wavespeedApiKey}`,
        },
      })

      if (!resultResponse.ok) {
        console.error("[v0] Polling error:", resultResponse.status, resultResponse.statusText)
        continue
      }

      const resultData = await resultResponse.json()
      console.log(`[v0] Poll ${attempts} response:`, JSON.stringify(resultData, null, 2))

      const status = resultData.data?.status || resultData.status
      const outputs = resultData.data?.outputs || resultData.outputs

      console.log(`[v0] Status: ${status}, Outputs:`, outputs)

      if ((status === "succeeded" || status === "completed") && outputs && outputs.length > 0) {
        const videoUrl = Array.isArray(outputs) ? outputs[0] : outputs
        console.log("[v0] ✓ Video generation completed! URL:", videoUrl)
        return videoUrl
      }

      if (status === "failed" || status === "error") {
        const error = resultData.data?.error || resultData.error || "Unknown error"
        throw new Error(`Wavespeed generation failed: ${error}`)
      }
    }

    throw new Error("Video generation timed out after 5 minutes")
  } catch (error) {
    console.error("[v0] Wavespeed video generation error:", error)
    throw error
  }
}

async function generateVideoWithGradio(
  imageBlob: Blob,
  prompt: string,
  durationSeconds: number,
  steps: number,
  guidanceScale: number,
  randomizeSeed: boolean,
  seed: number,
) {
  console.log("[v0] Starting video generation with Gradio")
  console.log("[v0] Image blob size:", imageBlob.size, "bytes, type:", imageBlob.type)
  console.log("[v0] Prompt:", prompt)
  console.log("[v0] Duration:", durationSeconds, "seconds")

  const spaceName = "zerogpu-aoti/wan2-2-fp8da-aoti-faster"
  console.log("[v0] Using Gradio space:", spaceName)

  const tokens = getHuggingFaceTokens()
  console.log("[v0] Found", tokens.length, "HuggingFace token(s)")

  if (tokens.length === 0) {
    throw new Error("No HuggingFace API tokens configured")
  }

  console.log("[v0] Passing Blob directly to Gradio client")

  let lastError: any = null
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    console.log(`[v0] ========== Attempting with token ${i + 1}/${tokens.length} ==========`)

    let client: any = null
    try {
      console.log(`[v0] Connecting to Gradio space: ${spaceName}`)
      client = await Client.connect(spaceName, {
        hf_token: token,
      })
      console.log(`[v0] ✓ Successfully connected to Gradio space`)

      const params = {
        input_image: imageBlob,
        prompt: prompt,
        steps: steps,
        negative_prompt:
          "色调艳丽, 过曝, 静态, 细节模糊不清, 字幕, 风格, 作品, 画作, 画面, 静止, 整体发灰, 最差质量, 低质量, JPEG压缩残留, 丑陋的, 残缺的, 多余的手指, 画得不好的手部, 画得不好的脸部, 畸形的, 残容的, 形态畸形的肢体, 手指融合, 静止不动的画面, 杂乱的背景, 三条腿, 背景人很多, 倒着走",
        duration_seconds: durationSeconds,
        guidance_scale: guidanceScale,
        guidance_scale_2: guidanceScale,
        seed: seed,
        randomize_seed: randomizeSeed,
      }

      console.log("[v0] Sending video generation request to /generate_video endpoint")
      console.log("[v0] Request params:", {
        prompt,
        steps,
        duration_seconds: durationSeconds,
        guidance_scale: guidanceScale,
        guidance_scale_2: guidanceScale,
        randomize_seed: randomizeSeed,
        seed,
        image_format: "Blob object (handled by Gradio client)",
        image_size: imageBlob.size,
      })

      const result = await client.predict("/generate_video", params)
      console.log("[v0] ✓ Received response from Gradio")
      console.log("[v0] Response structure:", JSON.stringify(result, null, 2))

      // According to Gradio API docs, result.data[0] is dict(video: filepath, subtitles: filepath | None)
      if (result.data && result.data[0]) {
        const videoData = result.data[0]
        console.log("[v0] Video data object:", JSON.stringify(videoData, null, 2))
        console.log("[v0] Video data type:", typeof videoData)

        // Extract the video filepath from the response
        let videoUrl: string | null = null

        if (typeof videoData === "string") {
          // If it's a string, use it directly
          videoUrl = videoData
          console.log("[v0] Video data is a string:", videoUrl)
        } else if (videoData && typeof videoData === "object") {
          const videoProperty = videoData.video || videoData.url || videoData.path
          console.log("[v0] Video property:", videoProperty)
          console.log("[v0] Video property type:", typeof videoProperty)

          if (typeof videoProperty === "string") {
            videoUrl = videoProperty
            console.log("[v0] Extracted video URL from property:", videoUrl)
          } else if (videoProperty && typeof videoProperty === "object") {
            // If video property is also an object, try to extract URL from it
            videoUrl = videoProperty.url || videoProperty.path || videoProperty.name
            console.log("[v0] Extracted video URL from nested object:", videoUrl)
          }
        }

        if (videoUrl && typeof videoUrl === "string") {
          console.log(`[v0] ✓✓✓ Video generated successfully with token ${i + 1}`)
          console.log(`[v0] Final video URL:`, videoUrl)
          return videoUrl
        } else {
          console.error("[v0] ✗ Could not extract video URL from response")
          console.error("[v0] Video data:", videoData)
          console.error("[v0] Video URL value:", videoUrl)
          console.error("[v0] Video URL type:", typeof videoUrl)
          throw new Error(`No valid video URL found in response. Got: ${typeof videoUrl}`)
        }
      }

      throw new Error("Invalid response structure from Gradio API")
    } catch (error) {
      console.error(`[v0] ✗✗✗ Error with token ${i + 1}:`, error)
      console.error(`[v0] Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error,
        fullError: JSON.stringify(error, null, 2),
      })
      lastError = error

      // Check if we should try the next token
      const shouldRetry = isRateLimitError(error) || isRetryableError(error)
      const hasMoreTokens = i < tokens.length - 1

      if (shouldRetry && hasMoreTokens) {
        console.log(`[v0] → Retryable error detected, switching to token ${i + 2}/${tokens.length}...`)
        continue // Skip to next token
      }

      // If we're here, either it's not retryable or we're out of tokens
      if (i === tokens.length - 1) {
        console.error(`[v0] ✗✗✗ All ${tokens.length} token(s) exhausted or failed`)
      }

      // Throw the error to exit the function
      throw error
    } finally {
      if (client && typeof client.close === "function") {
        try {
          await client.close()
          console.log(`[v0] Gradio client connection closed`)
        } catch (closeError) {
          console.error("[v0] Error closing Gradio client:", closeError)
        }
      }
    }
  }

  throw lastError || new Error("All HuggingFace accounts exhausted")
}

async function generateVideoWithHuggingFaceRouter(imageBlob: Blob, prompt: string, endpoint: string): Promise<string> {
  console.log("[v0] Starting video generation with HuggingFace Router")
  console.log("[v0] Endpoint:", endpoint)
  console.log("[v0] Prompt:", prompt)

  const hfToken = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_TOKEN
  if (!hfToken) {
    console.error("[v0] ✗ No HF_TOKEN or HUGGINGFACE_API_TOKEN found in environment")
    throw new Error("HF_TOKEN not configured")
  }

  console.log("[v0] Token source:", process.env.HF_TOKEN ? "HF_TOKEN" : "HUGGINGFACE_API_TOKEN")
  console.log("[v0] Token length:", hfToken.length)
  console.log("[v0] Token prefix:", hfToken.substring(0, 10) + "...")
  console.log("[v0] Token starts with 'hf_':", hfToken.startsWith("hf_"))

  try {
    console.log("[v0] Converting image to base64")
    const imageBuffer = await imageBlob.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString("base64")
    console.log("[v0] Image converted to base64, length:", base64Image.length)

    // Use image_url with data URL format and prompt at top level
    const requestBody = {
      image_url: `data:image/png;base64,${base64Image}`,
      prompt: prompt,
    }

    console.log("[v0] Submitting job to HuggingFace Router queue")
    console.log("[v0] Request body structure:", { image_url: "data:image/png;base64...", prompt: requestBody.prompt })

    const submitResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    console.log("[v0] Submit response status:", submitResponse.status)
    console.log("[v0] Submit response headers:", Object.fromEntries(submitResponse.headers.entries()))

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text()
      console.error("[v0] HuggingFace Router submit error:", errorText)
      throw new Error(`HuggingFace Router API error (${submitResponse.status}): ${errorText}`)
    }

    const contentType = submitResponse.headers.get("content-type") || ""
    console.log("[v0] Response content-type:", contentType)

    let submitData: any
    try {
      const responseText = await submitResponse.text()
      console.log("[v0] Raw response (first 500 chars):", responseText.substring(0, 500))

      if (contentType.includes("application/json")) {
        submitData = JSON.parse(responseText)
        console.log("[v0] Parsed JSON response:", JSON.stringify(submitData, null, 2))
      } else {
        console.log("[v0] Non-JSON response, treating as error")
        throw new Error(`Unexpected response type: ${contentType}. Response: ${responseText.substring(0, 200)}`)
      }
    } catch (parseError) {
      console.error("[v0] Failed to parse response:", parseError)
      throw new Error(`Failed to parse HuggingFace Router response: ${parseError}`)
    }

    const jobId =
      submitData.id ||
      submitData.job_id ||
      submitData.jobId ||
      submitData.request_id ||
      submitData.requestId ||
      submitData.task_id ||
      submitData.taskId

    const statusUrl =
      submitData.status_url ||
      submitData.statusUrl ||
      submitData.url ||
      submitData.status ||
      submitData.check_url ||
      submitData.checkUrl

    console.log("[v0] Extracted job ID:", jobId)
    console.log("[v0] Extracted status URL:", statusUrl)
    console.log("[v0] Full response keys:", Object.keys(submitData))

    if (!jobId && !statusUrl) {
      console.error("[v0] No job ID or status URL found in response")
      console.error("[v0] Response structure:", JSON.stringify(submitData, null, 2))
      throw new Error(
        `No job ID or status URL in HuggingFace Router response. Response keys: ${Object.keys(submitData).join(", ")}`,
      )
    }

    console.log("[v0] ✓ Job submitted successfully")
    return JSON.stringify({ jobId, statusUrl, endpoint })
  } catch (error) {
    console.error("[v0] HuggingFace Router video generation error:", error)
    console.error("[v0] Error type:", typeof error)
    console.error("[v0] Error details:", error instanceof Error ? error.message : String(error))
    throw error
  }
}

async function checkEliteJobStatus(
  jobId: string,
  statusUrl: string,
  endpoint: string,
): Promise<{ status: string; videoUrl?: string }> {
  console.log("[v0] ========== ELITE JOB STATUS CHECK ==========")
  console.log("[v0] Job ID:", jobId)
  console.log("[v0] Status URL:", statusUrl)
  console.log("[v0] Endpoint:", endpoint)

  if (!statusUrl) {
    throw new Error("No status URL provided - cannot poll job status")
  }

  const pollUrl = statusUrl
  console.log("[v0] Polling exact status URL (pre-signed, no modifications):", pollUrl.substring(0, 150) + "...")

  try {
    console.log("[v0] Fetching with empty headers (no Authorization, no credentials)")
    const pollResponse = await fetch(pollUrl, {
      headers: {}, // Explicitly empty - no Authorization header
    })

    console.log("[v0] Poll response status:", pollResponse.status)
    console.log("[v0] Poll response headers:", Object.fromEntries(pollResponse.headers.entries()))

    if (!pollResponse.ok) {
      const errorText = await pollResponse.text()
      console.error("[v0] ✗ Polling failed:", pollResponse.status, errorText)

      if (pollResponse.status === 401) {
        console.error("[v0] ✗✗✗ 401 Unauthorized - possible causes:")
        console.error("[v0]   1. Status URL signature is invalid or expired")
        console.error("[v0]   2. Status URL was modified (query params changed)")
        console.error("[v0]   3. Extra headers were sent (should be none)")
        console.error("[v0] Exact URL polled:", pollUrl)
      }

      return { status: "error" }
    }

    const contentType = pollResponse.headers.get("content-type") || ""
    console.log("[v0] Response content-type:", contentType)

    let pollData: any
    try {
      const responseText = await pollResponse.text()
      console.log("[v0] Response text (first 500 chars):", responseText.substring(0, 500))

      if (contentType.includes("application/json")) {
        pollData = JSON.parse(responseText)
        console.log("[v0] Parsed poll response:", JSON.stringify(pollData, null, 2))
      } else {
        console.log("[v0] Non-JSON poll response, job still processing")
        return { status: "processing" }
      }
    } catch (parseError) {
      console.error("[v0] Failed to parse poll response:", parseError)
      return { status: "processing" }
    }

    const status = (pollData.status || pollData.state || "").toUpperCase()
    console.log("[v0] Job status:", status)

    if (status === "COMPLETED" || status === "FINISHED" || status === "SUCCEEDED") {
      console.log("[v0] ✓ Job completed, extracting video URL")

      const videoUrl =
        pollData.output?.video?.url ||
        pollData.output?.url ||
        pollData.result?.video?.url ||
        pollData.result?.url ||
        pollData.video_url ||
        pollData.videoUrl ||
        pollData.output ||
        pollData.result ||
        pollData.url

      console.log("[v0] Extracted video URL:", videoUrl)
      console.log("[v0] Response structure:", Object.keys(pollData))

      if (videoUrl && typeof videoUrl === "string") {
        console.log("[v0] Downloading video from:", videoUrl)
        const videoResponse = await fetch(videoUrl)
        if (!videoResponse.ok) {
          throw new Error(`Failed to download video: ${videoResponse.statusText}`)
        }
        const videoBytes = await videoResponse.arrayBuffer()
        console.log("[v0] Downloaded video:", videoBytes.byteLength, "bytes")

        console.log("[v0] Uploading video to Vercel Blob")
        const fileName = `videos/elite/${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`
        const blob = await put(fileName, videoBytes, {
          access: "public",
          contentType: "video/mp4",
        })
        console.log("[v0] ✓✓✓ Video uploaded to Blob storage:", blob.url)
        return { status: "completed", videoUrl: blob.url }
      }

      console.error("[v0] ✗ No video URL found in completed response")
      console.error("[v0] Response keys:", Object.keys(pollData))
      console.error("[v0] Full response:", JSON.stringify(pollData, null, 2))
      throw new Error(`No video URL in completed job response. Response keys: ${Object.keys(pollData).join(", ")}`)
    }

    if (status === "FAILED" || status === "ERROR" || status === "CANCELLED" || pollData.error) {
      const error = pollData.error || pollData.message || pollData.error_message || "Unknown error"
      console.error("[v0] ✗✗✗ Job failed:", error)
      throw new Error(`Elite video generation failed: ${error}`)
    }

    console.log("[v0] Job still processing, will poll again")
    return { status: "processing" }
  } catch (error) {
    console.error("[v0] ✗✗✗ Error checking Elite job status:", error)
    console.error("[v0] Error type:", typeof error)
    console.error("[v0] Error message:", error instanceof Error ? error.message : String(error))
    throw error
  }
}

const VIDEO_VALIDATION_LIMITS = {
  duration: { min: 1, max: 8 },
  steps: { min: 1, max: 10, default: 4 },
  guidanceScale: { min: 0.5, max: 5, default: 1 },
  seed: { min: -1, max: 2147483647 },
}

function validateVideoParameter(value: number | undefined, paramName: keyof typeof VIDEO_VALIDATION_LIMITS): number {
  const limits = VIDEO_VALIDATION_LIMITS[paramName]
  const numValue = value !== undefined ? value : (limits.default ?? limits.min)

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

export async function POST(request: Request) {
  console.log("[v0] ========================================")
  console.log("[v0] VIDEO GENERATION API CALLED")
  console.log("[v0] ========================================")

  try {
    console.log("[v0] Step 1: Creating Supabase client")
    const supabase = await createServerClient()

    console.log("[v0] Step 2: Getting authenticated user")
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] ✗ No authenticated user found")
      return Response.json({ error: "Authentication required" }, { status: 401 })
    }

    console.log("[v0] ✓ User authenticated:", user.id, user.email)

    console.log("[v0] Step 3: Ensuring user exists in database")
    await ensureUserExists(user.id, user.email || "", user.user_metadata?.name, user.user_metadata?.avatar_url)
    console.log("[v0] ✓ User exists in database")

    console.log("[v0] Step 4: Checking if app is enabled")
    const { data: settings } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "app_enabled")
      .single()

    const appEnabled = settings?.setting_value ?? true
    console.log("[v0] App enabled:", appEnabled)

    if (!appEnabled) {
      console.log("[v0] ✗ Video generation is disabled by admin")
      return Response.json(
        { error: "Video generation is temporarily disabled. Please try again later." },
        { status: 503 },
      )
    }

    console.log("[v0] Step 5: Parsing form data")
    const formData = await request.formData()
    const image = formData.get("image") as File
    const prompt = formData.get("prompt") as string
    const durationSeconds = Number.parseInt(formData.get("duration_seconds") as string) || 5
    const style = (formData.get("style") as VideoStyle) || "lovely"
    const steps = Number.parseInt(formData.get("steps") as string) || 4
    const guidanceScale = Number.parseFloat(formData.get("guidance_scale") as string) || 1
    const randomizeSeed = formData.get("randomize_seed") === "true"
    const seed = Number.parseInt(formData.get("seed") as string) || 0

    const eliteJobId = formData.get("elite_job_id") as string | null
    const eliteStatusUrl = formData.get("elite_status_url") as string | null
    const eliteEndpoint = formData.get("elite_endpoint") as string | null

    if (eliteJobId && eliteStatusUrl && eliteEndpoint && style === "elite") {
      console.log("[v0] Checking existing Elite job status")
      const statusResult = await checkEliteJobStatus(eliteJobId, eliteStatusUrl, eliteEndpoint)

      if (statusResult.status === "completed" && statusResult.videoUrl) {
        console.log("[v0] Elite job completed, saving to database")
        await supabase.from("videos").insert({
          user_id: user.id,
          url: statusResult.videoUrl,
          prompt,
          duration_seconds: durationSeconds,
          is_saved: false,
        })

        return Response.json({ videoUrl: statusResult.videoUrl, status: "completed" })
      }

      return Response.json({
        status: statusResult.status,
        jobId: eliteJobId,
        statusUrl: eliteStatusUrl,
        endpoint: eliteEndpoint,
      })
    }

    const validatedDuration = validateVideoParameter(durationSeconds, "duration")
    const validatedSteps = validateVideoParameter(steps, "steps")
    const validatedGuidanceScale = validateVideoParameter(guidanceScale, "guidanceScale")
    const validatedSeed = validateVideoParameter(seed, "seed")

    console.log("[v0] ✓ Form data parsed:")
    console.log("[v0]   - Prompt:", prompt)
    console.log("[v0]   - Duration:", validatedDuration, "seconds (requested:", durationSeconds, ")")
    console.log("[v0]   - Style:", style)
    console.log("[v0]   - Steps:", validatedSteps, "(requested:", steps, ")")
    console.log("[v0]   - Guidance scale:", validatedGuidanceScale, "(requested:", guidanceScale, ")")
    console.log("[v0]   - Seed:", validatedSeed, "(requested:", seed, ")")
    console.log("[v0]   - Image:", image ? `${image.name} (${image.type}, ${image.size} bytes)` : "MISSING")

    const styleConfig = VIDEO_STYLE_CONFIGS[style]
    if (!styleConfig) {
      console.log("[v0] ✗ Invalid style:", style)
      return Response.json({ error: "Invalid video style selected" }, { status: 400 })
    }

    console.log("[v0] Using style:", styleConfig.displayName, "provider:", styleConfig.provider)

    if (!prompt || !image) {
      console.log("[v0] ✗ Missing required fields")
      return Response.json({ error: "Prompt and image are required" }, { status: 400 })
    }

    if (!image.type.startsWith("image/")) {
      console.log("[v0] ✗ Invalid image file type:", image.type)
      return Response.json({ error: "Invalid image file type" }, { status: 400 })
    }

    if (image.size > 10 * 1024 * 1024) {
      console.log("[v0] ✗ Image file too large:", image.size, "bytes")
      return Response.json({ error: "Image file too large (max 10MB)" }, { status: 400 })
    }

    console.log("[v0] Step 6: Charging credits")
    const creditCost =
      validatedDuration === 1
        ? CREDIT_COSTS.video1
        : validatedDuration === 3
          ? CREDIT_COSTS.video3
          : CREDIT_COSTS.video5
    console.log("[v0] Credit cost:", creditCost, "diamonds")

    const chargeResult = await chargeCredits(
      user.id,
      validatedDuration === 1 ? "video1" : validatedDuration === 3 ? "video3" : "video5",
    )

    if (!chargeResult.success) {
      console.log("[v0] ✗ Failed to charge credits:", chargeResult.error)
      return Response.json({ error: chargeResult.error || "Failed to charge credits" }, { status: 409 })
    }

    console.log("[v0] ✓ Credits charged successfully")
    console.log("[v0] New balance:", chargeResult.newBalance, "diamonds")

    let videoUrl: string

    if (styleConfig.provider === "wavespeed") {
      console.log("[v0] Step 7: Using Wavespeed for Express/Express HD style")

      // Upload image to Blob storage first to get a public URL
      console.log("[v0] Uploading input image to Blob storage")
      const imageBuffer = await image.arrayBuffer()
      const imageFileName = `video-inputs/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${image.type.split("/")[1]}`
      const imageBlob = await put(imageFileName, imageBuffer, {
        access: "public",
        contentType: image.type,
      })
      const imageUrl = imageBlob.url
      console.log("[v0] ✓ Input image uploaded:", imageUrl)

      console.log("[v0] Step 8: Generating video with Wavespeed")
      videoUrl = await generateVideoWithWavespeed(
        imageUrl,
        prompt,
        validatedDuration,
        styleConfig.wavespeedEndpoint!,
        randomizeSeed,
        validatedSeed,
      )
      console.log("[v0] ✓ Wavespeed video URL:", videoUrl)
    } else if (styleConfig.provider === "huggingface_router") {
      console.log("[v0] Step 7: Using HuggingFace Router for Elite style")
      console.log("[v0] Converting image to blob")
      const imageBuffer = await image.arrayBuffer()
      const imageBlob = new Blob([imageBuffer], { type: image.type })
      console.log("[v0] ✓ Image blob created:", imageBlob.size, "bytes")

      console.log("[v0] Step 8: Submitting job to HuggingFace Router (async)")
      const jobInfo = await generateVideoWithHuggingFaceRouter(
        imageBlob,
        prompt,
        styleConfig.huggingfaceRouterEndpoint!,
      )
      const { jobId, statusUrl, endpoint } = JSON.parse(jobInfo)
      console.log("[v0] ✓ Job submitted, returning job info for polling")

      return Response.json({
        status: "processing",
        jobId,
        statusUrl,
        endpoint,
        remainingCredits: chargeResult.newBalance,
      })
    } else {
      console.log("[v0] Step 7: Using Gradio for Lovely style")
      console.log("[v0] Converting image to blob")
      const imageBuffer = await image.arrayBuffer()
      const imageBlob = new Blob([imageBuffer], { type: image.type })
      console.log("[v0] ✓ Image blob created:", imageBlob.size, "bytes")

      console.log("[v0] Step 8: Generating video with Gradio")
      const gradioVideoUrl = await generateVideoWithGradio(
        imageBlob,
        prompt,
        validatedDuration,
        validatedSteps,
        validatedGuidanceScale,
        randomizeSeed,
        validatedSeed,
      )
      console.log("[v0] ✓ Gradio video URL:", gradioVideoUrl)

      console.log("[v0] Step 9: Downloading video from Gradio")
      const videoResponse = await fetch(gradioVideoUrl)
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.statusText}`)
      }
      const videoBlob = await videoResponse.blob()
      console.log("[v0] ✓ Video downloaded:", videoBlob.size, "bytes, type:", videoBlob.type)

      console.log("[v0] Step 10: Uploading video to Vercel Blob")
      const fileName = `videos/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`
      const blob = await put(fileName, videoBlob, {
        access: "public",
        contentType: videoBlob.type || "video/mp4",
      })
      videoUrl = blob.url
      console.log("[v0] ✓ Video uploaded to Blob storage:", videoUrl)
    }

    console.log("[v0] Step 11: Saving video to database")
    try {
      const { error: insertError } = await supabase.from("videos").insert({
        user_id: user.id,
        url: videoUrl,
        prompt,
        duration_seconds: validatedDuration,
        is_saved: false,
      })

      if (insertError) {
        console.error("[v0] ✗ Database insert error:", insertError)
      } else {
        console.log("[v0] ✓ Video saved to database")
      }
    } catch (dbError) {
      console.error("[v0] ✗ Database error:", dbError)
    }

    console.log("[v0] ========================================")
    console.log("[v0] SUCCESS - Returning video URL to client")
    console.log("[v0] ========================================")
    return Response.json({ videoUrl, remainingCredits: chargeResult.newBalance })
  } catch (error) {
    console.error("[v0] ========================================")
    console.error("[v0] FATAL ERROR in video generation")
    console.error("[v0] ========================================")
    console.error("[v0] Error:", error)
    console.error("[v0] Error type:", typeof error)
    console.error("[v0] Error message:", error instanceof Error ? error.message : String(error))
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : undefined)

    const errorMessage = error instanceof Error ? error.message : "Failed to generate video. Please try again."
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}
