import { ProviderAdapter, GenerationRequest, GenerationResponse, ModelConfig } from '../types'
import { put } from '@vercel/blob'

export class HuggingFaceProvider implements ProviderAdapter {
  name = 'huggingface' as const

  async generate(request: GenerationRequest, config: ModelConfig): Promise<GenerationResponse> {
    const requestId = request.requestId
    console.log(`[HF ${requestId}] Generating with model: ${config.endpoint}`)

    const tokens = [
      process.env.HUGGINGFACE_API_TOKEN,
      process.env.HUGGINGFACE_API_TOKEN_2,
      process.env.HUGGINGFACE_API_TOKEN_3,
    ].filter(Boolean)

    if (tokens.length === 0) {
      return {
        success: false,
        error: 'No HuggingFace API tokens configured',
        code: 'PROVIDER_ERROR',
        provider: 'huggingface',
        retryable: false,
      }
    }

    // Shuffle tokens for random starting point
    const shuffledTokens = [...tokens].sort(() => Math.random() - 0.5)
    const errors: string[] = []

    // Try each API key sequentially until one works
    for (let i = 0; i < shuffledTokens.length; i++) {
      const token = shuffledTokens[i]!
      const tokenNum = i + 1
      
      try {
        console.log(`[HF ${requestId}] Trying API key ${tokenNum}/${shuffledTokens.length}`)
        
        const url = `https://api-inference.huggingface.co/models/${config.endpoint}`

        const payload: any = {
          inputs: request.prompt,
          parameters: {
            num_inference_steps: request.steps || config.defaults?.steps,
            guidance_scale: request.guidance || config.defaults?.guidance,
            width: request.width || config.defaults?.width,
            height: request.height || config.defaults?.height,
            seed: request.seed !== undefined ? request.seed : Math.floor(Math.random() * 1000000000),
          },
        }

        if (request.negativePrompt) {
          payload.parameters.negative_prompt = request.negativePrompt
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.log(`[HF ${requestId}] API key ${tokenNum} failed (${response.status}): ${errorText.substring(0, 100)}`)
          errors.push(`Key ${tokenNum}: ${response.status} - ${errorText.substring(0, 50)}`)

          // For 503 and 429, still try next key but mark as retryable if all fail
          if (response.status === 503 || response.status === 429) {
            continue // Try next key
          }

          // For other errors, try next key
          continue
        }

        // Success! Process the image
        const imageBuffer = await response.arrayBuffer()
        console.log(`[HF ${requestId}] ✓ API key ${tokenNum} succeeded. Received image: ${imageBuffer.byteLength} bytes`)

        const fileName = `${request.type}/${request.userId}/${Date.now()}-${requestId}.png`
        const blob = await put(fileName, imageBuffer, {
          access: 'public',
          contentType: 'image/png',
        })

        console.log(`[HF ${requestId}] ✓ Uploaded to Blob:`, blob.url)

        return {
          success: true,
          mediaUrl: blob.url,
          metadata: {
            provider: 'huggingface',
            modelId: config.id,
            requestId,
            timestamp: Date.now(),
          },
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.log(`[HF ${requestId}] API key ${tokenNum} error: ${errorMsg}`)
        errors.push(`Key ${tokenNum}: ${errorMsg.substring(0, 50)}`)
        continue // Try next key
      }
    }

    // All keys failed - return error
    console.error(`[HF ${requestId}] All ${shuffledTokens.length} API keys failed:`, errors)
    return {
      success: false,
      error: `Image generation failed after trying all API keys. Please try again. [Debug: ${errors[errors.length - 1]}]`,
      code: 'PROVIDER_ERROR',
      provider: 'huggingface',
      retryable: true,
    }
  }
}
