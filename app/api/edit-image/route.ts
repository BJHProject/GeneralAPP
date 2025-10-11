import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"
import { ensureUserExists, chargeCredits } from "@/lib/credits"

export const maxDuration = 60 // 60 seconds

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

async function editImageWithWavespeed(imageUrl: string, prompt: string, size: string, tokenIndex = 0): Promise<string> {
  const tokens = getHuggingFaceTokens()

  if (tokens.length === 0) {
    throw new Error("No HuggingFace API tokens configured")
  }

  console.log(`[v0] Found ${tokens.length} HuggingFace token(s)`)
  console.log(`[v0] Attempting with token ${tokenIndex + 1}/${tokens.length}`)

  const token = tokens[tokenIndex]
  const wavespeedApiKey = process.env.WAVESPEED_API_KEY

  if (!wavespeedApiKey) {
    throw new Error("WAVESPEED_API_KEY not configured")
  }

  try {
    // Submit edit task
    console.log("[v0] Submitting edit task to Wavespeed API")
    const submitResponse = await fetch("https://api.wavespeed.ai/api/v3/bytedance/seedream-v4/edit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${wavespeedApiKey}`,
      },
      body: JSON.stringify({
        enable_base64_output: false,
        enable_sync_mode: false,
        images: [imageUrl],
        prompt: prompt,
        size: size,
      }),
    })

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text()
      console.error("[v0] Wavespeed submit error:", errorText)

      // Check if it's a rate limit error
      const isRateLimitError =
        errorText.toLowerCase().includes("quota") ||
        errorText.toLowerCase().includes("limit") ||
        errorText.toLowerCase().includes("exceeded") ||
        submitResponse.status === 429

      if (isRateLimitError && tokenIndex < tokens.length - 1) {
        console.log(`[v0] ✗ Error with token ${tokenIndex + 1}: Rate limit reached, trying next token`)
        return editImageWithWavespeed(imageUrl, prompt, size, tokenIndex + 1)
      }

      throw new Error(`Wavespeed API error: ${errorText}`)
    }

    const submitData = await submitResponse.json()
    console.log("[v0] Edit task submitted. Full response:", JSON.stringify(submitData, null, 2))

    const requestId =
      submitData.data?.id || submitData.request_id || submitData.requestId || submitData.id || submitData.task_id

    if (!requestId) {
      console.error("[v0] No request ID found in response. Response keys:", Object.keys(submitData))
      console.error("[v0] Full response data:", submitData)
      throw new Error(`No request ID returned from Wavespeed API. Response: ${JSON.stringify(submitData)}`)
    }

    console.log("[v0] Request ID found:", requestId)

    // Poll for result
    console.log("[v0] Polling for result with requestId:", requestId)
    let attempts = 0
    const maxAttempts = 12 // Reduced to 60 seconds (5 second intervals)

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds
      attempts++

      console.log(`[v0] Polling attempt ${attempts}/${maxAttempts}`)

      const resultResponse = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`, {
        headers: {
          Authorization: `Bearer ${wavespeedApiKey}`,
        },
      })

      if (!resultResponse.ok) {
        const errorText = await resultResponse.text()
        console.error("[v0] Result polling error:", errorText)
        continue
      }

      const resultData = await resultResponse.json()

      if (attempts % 5 === 0 || attempts === 1) {
        console.log(`[v0] Poll attempt ${attempts} - Full response:`, JSON.stringify(resultData, null, 2))
      }

      const status = resultData.data?.status || resultData.status
      const outputs = resultData.data?.outputs || resultData.outputs || resultData.output

      console.log(
        `[v0] Attempt ${attempts} - Status: ${status}, Outputs type: ${Array.isArray(outputs) ? "array" : typeof outputs}, Outputs length: ${Array.isArray(outputs) ? outputs.length : "N/A"}`,
      )

      if (status === "succeeded" || status === "completed") {
        console.log(`[v0] Status is ${status}, checking outputs...`)

        if (outputs) {
          if (Array.isArray(outputs) && outputs.length > 0) {
            const outputUrl = outputs[0]
            console.log("[v0] ✓ Edit completed successfully")
            console.log("[v0] Output URL:", outputUrl)
            return outputUrl
          } else if (!Array.isArray(outputs) && outputs) {
            console.log("[v0] ✓ Edit completed successfully with single output")
            console.log("[v0] Output URL:", outputs)
            return outputs
          } else {
            console.log(`[v0] Status is ${status} but outputs array is empty, continuing to poll...`)
          }
        } else {
          console.log(`[v0] Status is ${status} but no outputs field found, continuing to poll...`)
        }
      }

      if (status === "failed") {
        const error = resultData.data?.error || resultData.error || "Unknown error"
        console.error("[v0] Edit failed with error:", error)
        throw new Error(`Image editing failed: ${error}`)
      }

      if (status === "created" || status === "processing" || status === "pending") {
        console.log(`[v0] Still ${status}... (${attempts}/${maxAttempts})`)
      } else if (status) {
        console.log(`[v0] Unknown status: ${status}`)
      }
    }

    console.error("[v0] Polling timed out after", maxAttempts, "attempts")
    throw new Error(`Image editing timed out after ${maxAttempts * 5} seconds`)
  } catch (error: any) {
    console.error(`[v0] ✗ Error with token ${tokenIndex + 1}:`, error.message)

    // Check if we should try the next token
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
      return editImageWithWavespeed(imageUrl, prompt, size, tokenIndex + 1)
    }

    console.log(`[v0] All ${tokens.length} token(s) exhausted`)
    throw error
  }
}

export async function POST(request: NextRequest) {
  console.log("[v0] ========== EDIT IMAGE API REQUEST RECEIVED ==========")
  console.log("[v0] Request URL:", request.url)
  console.log("[v0] Request method:", request.method)

  try {
    console.log("[v0] Edit image API called")

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] No user found - unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", user.id)
    console.log("[v0] Ensuring user exists")
    await ensureUserExists(user.id, user.email || "", user.user_metadata?.name, user.user_metadata?.avatar_url)

    console.log("[v0] Charging credits for image edit")
    const chargeResult = await chargeCredits(user.id, "edit")

    if (!chargeResult.success) {
      console.log("[v0] Failed to charge credits:", chargeResult.error)
      return NextResponse.json({ error: chargeResult.error || "Insufficient credits" }, { status: 409 })
    }

    console.log("[v0] Credits charged successfully. New balance:", chargeResult.newBalance)

    // Check if app is enabled
    const { data: settings } = await supabase.from("app_settings").select("*").eq("key", "generation_enabled").single()

    if (settings && settings.value === false) {
      console.log("[v0] Image editing is disabled")
      return NextResponse.json(
        { error: "Image editing is temporarily unavailable. Please try again later." },
        { status: 503 },
      )
    }

    console.log("[v0] Parsing form data...")
    const formData = await request.formData()
    const image = formData.get("image") as File
    const prompt = formData.get("prompt") as string

    console.log("[v0] Form data parsed - Image:", image?.name, "Prompt:", prompt)

    if (!image || !prompt) {
      console.log("[v0] Missing image or prompt")
      return NextResponse.json({ error: "Image and prompt are required" }, { status: 400 })
    }

    console.log("[v0] Uploading input image to blob storage")

    // Upload input image to blob storage
    const inputBlob = await put(`edits/input-${Date.now()}-${image.name}`, image, {
      access: "public",
    })

    console.log("[v0] Input image uploaded:", inputBlob.url)

    // Get image dimensions
    const imageBuffer = await image.arrayBuffer()
    const imageData = Buffer.from(imageBuffer)

    // For simplicity, we'll use a default size. In production, you'd want to detect actual dimensions
    const size = "1024*1024"

    console.log("[v0] Starting Wavespeed edit with size:", size)
    // Edit image using Wavespeed API
    const editedImageUrl = await editImageWithWavespeed(inputBlob.url, prompt, size)

    console.log("[v0] Edited image URL received:", editedImageUrl)

    // Download and re-upload to our blob storage
    console.log("[v0] Downloading edited image from Wavespeed")
    const editedImageResponse = await fetch(editedImageUrl)
    const editedImageBlob = await editedImageResponse.blob()

    console.log("[v0] Re-uploading to our blob storage")
    const finalBlob = await put(`edits/output-${Date.now()}.png`, editedImageBlob, {
      access: "public",
    })

    console.log("[v0] Final edited image stored:", finalBlob.url)

    // Save to database
    console.log("[v0] Saving to database")
    const { error: dbError } = await supabase.from("edited_images").insert({
      user_id: user.id,
      input_image_url: inputBlob.url,
      output_image_url: finalBlob.url,
      prompt: prompt,
      is_saved: false,
    })

    if (dbError) {
      console.error("[v0] Database error:", dbError)
      throw dbError
    }

    console.log("[v0] Edit saved to database successfully")

    return NextResponse.json({
      imageUrl: finalBlob.url,
      inputImageUrl: inputBlob.url,
      creditsRemaining: chargeResult.newBalance,
      creditsUsed: 1000,
    })
  } catch (error: any) {
    console.error("[v0] Edit image error:", error)
    console.error("[v0] Error stack:", error.stack)
    return NextResponse.json({ error: error.message || "Failed to edit image" }, { status: 500 })
  }
}
