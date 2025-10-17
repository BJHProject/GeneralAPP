import { ProviderAdapter, GenerationRequest, GenerationResponse, ModelConfig } from '../types'
import { put } from '@vercel/blob'

export class HuggingFaceProvider implements ProviderAdapter {
  name = 'huggingface' as const

  async generate(request: GenerationRequest, config: ModelConfig): Promise<GenerationResponse> {
    const requestId = request.requestId
    console.log(`[HF ${requestId}] Generating with model: ${config.endpoint}`)

    try {
      const tokens = [
        process.env.HUGGINGFACE_API_TOKEN,
        process.env.HUGGINGFACE_API_TOKEN_2,
        process.env.HUGGINGFACE_API_TOKEN_3,
      ].filter(Boolean)

      if (tokens.length === 0) {
        throw new Error('No HuggingFace API tokens configured')
      }

      const token = tokens[Math.floor(Math.random() * tokens.length)]!
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

      console.log(`[HF ${requestId}] Request payload:`, JSON.stringify(payload, null, 2))

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
        console.error(`[HF ${requestId}] Error ${response.status}:`, errorText)

        if (response.status === 503) {
          console.error(`[HF ${requestId}] Model loading error (503)`)
          return {
            success: false,
            error: 'The model is currently loading. Please try again in a moment.',
            code: 'PROVIDER_ERROR',
            provider: 'huggingface',
            retryable: true,
          }
        }

        if (response.status === 429) {
          console.error(`[HF ${requestId}] Rate limit exceeded (429)`)
          return {
            success: false,
            error: 'Service is temporarily busy. Please try again in a moment.',
            code: 'QUOTA_EXCEEDED',
            provider: 'huggingface',
            retryable: true,
          }
        }

        console.error(`[HF ${requestId}] API error: ${errorText}`)
        return {
          success: false,
          error: `Image generation failed. Please try again. [Debug: ${errorText.substring(0, 100)}]`,
          code: 'PROVIDER_ERROR',
          provider: 'huggingface',
          retryable: false,
        }
      }

      const imageBuffer = await response.arrayBuffer()
      console.log(`[HF ${requestId}] Received image: ${imageBuffer.byteLength} bytes`)

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
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      console.error(`[HF ${requestId}] CRITICAL ERROR:`, {
        message: errorMessage,
        stack: errorStack,
        error: error,
      })
      return {
        success: false,
        error: `Image generation encountered an error. Please try again. [Debug: ${errorMessage}]`,
        code: 'PROVIDER_ERROR',
        provider: 'huggingface',
        retryable: true,
      }
    }
  }
}
